#!/usr/bin/env python3
"""Generate all FarmOS POC images using Google Imagen 4 API."""
import json, base64, os, sys, time
from urllib.request import Request, urlopen
from urllib.error import HTTPError

KEYS = [
    "AIzaSyAoevnCxaWGn_cSDhzFAVJMpr-d_MGI6kI",
    "AIzaSyA8tfzyjjmvYRt5hYozdLtGOi1bv0swuNY",
    "AIzaSyA5DlWIE5BEBynDonVRVUQNcSxgVikRfJ8",
]

BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict"
IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "farmos-poc", "public", "images")

IMAGES = [
    {
        "prompt": "Close-up photograph of apple tree leaves showing brown circular spots and yellowing, typical symptoms of apple leaf spot disease Marssonina blotch. Multiple round brown lesions with darker borders on green leaves. Realistic agricultural pest diagnosis reference photo, natural outdoor lighting.",
        "path": "sample-pest/apple-leaf-spot.jpg",
    },
    {
        "prompt": "Close-up macro photograph of green aphids clustered on apple tree new growth shoots and leaf undersides. Multiple small green insects visible on tender stems. Realistic agricultural pest identification reference photo, natural lighting.",
        "path": "sample-pest/apple-aphid.jpg",
    },
    {
        "prompt": "Close-up photograph of apple fruit showing anthracnose disease symptoms, dark brown to black sunken circular lesions on the red fruit surface. Realistic agricultural disease diagnosis reference photo, natural lighting.",
        "path": "sample-pest/apple-anthracnose.jpg",
    },
    {
        "prompt": "Beautiful healthy red Fuji apple fruit hanging on tree branch with green leaves, no disease or damage. Perfect specimen, vibrant red color, natural sunlight. Agricultural reference photo showing ideal healthy apple condition.",
        "path": "sample-pest/apple-healthy.jpg",
    },
    {
        "prompt": "Close-up photograph of apple fruit surface with concentric dark brown alternating ring patterns, ring rot disease symptoms. Realistic agricultural disease diagnosis reference photo, natural lighting.",
        "path": "sample-pest/apple-ring-rot.jpg",
    },
    {
        "prompt": "Portrait photograph of a friendly elderly Korean male farmer in his 60s wearing a sun hat and work vest, warm smile, standing in an apple orchard. Soft natural lighting, blurred green orchard background. Professional portrait style.",
        "path": "farmer-avatar.jpg",
    },
    {
        "prompt": "Wide panoramic photograph of a beautiful Korean apple orchard landscape in summer. Rows of apple trees with red fruit, lush green foliage, blue sky with light clouds. Warm golden hour lighting. Hero banner image for farming app.",
        "path": "farm-hero.jpg",
    },
]

key_idx = 0

def generate(prompt, output_path):
    global key_idx
    full_path = os.path.join(IMAGES_DIR, output_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    for attempt in range(len(KEYS)):
        key = KEYS[key_idx]
        url = f"{BASE_URL}?key={key}"
        payload = json.dumps({
            "instances": [{"prompt": prompt}],
            "parameters": {"sampleCount": 1, "aspectRatio": "1:1"}
        }).encode()

        req = Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read())

            predictions = data.get("predictions", [])
            if not predictions:
                print(f"  No predictions returned, trying next key...")
                key_idx = (key_idx + 1) % len(KEYS)
                continue

            b64 = predictions[0].get("bytesBase64Encoded", "")
            if not b64:
                print(f"  No image data, trying next key...")
                key_idx = (key_idx + 1) % len(KEYS)
                continue

            img_bytes = base64.b64decode(b64)
            with open(full_path, "wb") as f:
                f.write(img_bytes)
            print(f"  Saved: {full_path} ({len(img_bytes)/1024:.1f} KB)")
            return True

        except HTTPError as e:
            if e.code in (429, 403):
                print(f"  Key {key_idx+1} rate limited, rotating...")
                key_idx = (key_idx + 1) % len(KEYS)
                continue
            else:
                body = e.read().decode() if e.fp else ""
                print(f"  HTTP {e.code}: {body[:200]}")
                key_idx = (key_idx + 1) % len(KEYS)
                continue
        except Exception as e:
            print(f"  Error: {e}")
            key_idx = (key_idx + 1) % len(KEYS)
            continue

    print(f"  FAILED after trying all keys")
    return False

if __name__ == "__main__":
    print(f"Generating {len(IMAGES)} images for FarmOS POC...")
    print(f"Output directory: {os.path.abspath(IMAGES_DIR)}")
    print()

    success = 0
    for i, img in enumerate(IMAGES, 1):
        print(f"[{i}/{len(IMAGES)}] {img['path']}")
        if generate(img["prompt"], img["path"]):
            success += 1
        time.sleep(1)  # Small delay between requests

    print(f"\nDone: {success}/{len(IMAGES)} images generated successfully")
