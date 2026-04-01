#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../farmos-poc/.env') });

// Rotate through up to 3 API keys — if one hits rate limit, try the next
const API_KEYS = [
  process.env.GEMINI_API_KEY1,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
].filter(Boolean);

let currentKeyIndex = 0;

function getApiKey() {
  return API_KEYS[currentKeyIndex];
}

function rotateKey() {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return currentKeyIndex;
}

const IMAGES_DIR = path.resolve(__dirname, '../farmos-poc/public/images');

// Ensure images directory exists
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const server = new McpServer({
  name: 'gemini-imagen',
  version: '1.0.0',
});

server.tool(
  'generate_farm_image',
  {
    prompt: z.string().describe('Image generation prompt. Be descriptive about the agricultural scene, crop, pest, or UI element you want.'),
    filename: z.string().describe('Filename to save as (e.g. "apple-leaf-spot.jpg"). Saved to farmos-poc/public/images/'),
    subfolder: z.string().optional().describe('Optional subfolder under public/images/ (e.g. "sample-pest", "icons")'),
  },
  async ({ prompt, filename, subfolder }) => {
    if (API_KEYS.length === 0) {
      return {
        content: [{ type: 'text', text: 'Error: No GEMINI_API_KEY set. Add GEMINI_API_KEY1, GEMINI_API_KEY2, etc. to farmos-poc/.env' }],
      };
    }

    const saveDir = subfolder ? path.join(IMAGES_DIR, subfolder) : IMAGES_DIR;
    fs.mkdirSync(saveDir, { recursive: true });
    const savePath = path.join(saveDir, filename);

    // Try each key until one works (handles rate limits)
    let lastError = '';
    for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
      const key = getApiKey();
      const keyNum = currentKeyIndex + 1;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: [{ prompt }],
              parameters: {
                sampleCount: 1,
                aspectRatio: '1:1',
                safetyFilterLevel: 'BLOCK_MEDIUM_AND_ABOVE',
              },
            }),
          }
        );

        if (response.status === 429 || response.status === 403) {
          // Rate limited or quota exceeded — rotate to next key
          const nextIdx = rotateKey();
          lastError = `Key ${keyNum} rate limited, rotating to key ${nextIdx + 1}`;
          continue;
        }

        if (!response.ok) {
          const errorBody = await response.text();
          lastError = `Gemini API error (${response.status}): ${errorBody}`;
          // For non-rate-limit errors, try next key too
          rotateKey();
          continue;
        }

        const data = await response.json();
        const predictions = data.predictions;

        if (!predictions || predictions.length === 0) {
          return {
            content: [{ type: 'text', text: 'No image generated. The prompt may have been filtered by safety settings. Try rephrasing.' }],
          };
        }

        const imageBytes = Buffer.from(predictions[0].bytesBase64Encoded, 'base64');
        fs.writeFileSync(savePath, imageBytes);

        const relativePath = path.relative(path.resolve(__dirname, '../farmos-poc/public'), savePath).replace(/\\/g, '/');

        return {
          content: [
            { type: 'text', text: `Image saved: ${savePath}\nReact src: "/${relativePath}"\nSize: ${(imageBytes.length / 1024).toFixed(1)} KB\nUsed key: ${keyNum}/${API_KEYS.length}` },
          ],
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        rotateKey();
        continue;
      }
    }

    return {
      content: [{ type: 'text', text: `All ${API_KEYS.length} API keys failed. Last error: ${lastError}` }],
    };
  }
);

server.tool(
  'list_farm_images',
  {},
  async () => {
    function listFiles(dir, prefix = '') {
      const results = [];
      if (!fs.existsSync(dir)) return results;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          results.push(...listFiles(path.join(dir, entry.name), rel));
        } else if (/\.(jpg|jpeg|png|webp|svg|gif)$/i.test(entry.name)) {
          const stat = fs.statSync(path.join(dir, entry.name));
          results.push(`/${rel} (${(stat.size / 1024).toFixed(1)} KB)`);
        }
      }
      return results;
    }

    const files = listFiles(IMAGES_DIR, 'images');
    return {
      content: [{ type: 'text', text: files.length > 0 ? `Images in public/:\n${files.join('\n')}` : 'No images found in public/images/' }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
