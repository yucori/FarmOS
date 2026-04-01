#!/usr/bin/env python3
"""Generate 9 FarmOS module icons using Nano Banana Pro (gemini-3-pro-image-preview)."""
import json, base64, os, time
from urllib.request import Request, urlopen
from urllib.error import HTTPError

KEYS = [
    "AIzaSyAoevnCxaWGn_cSDhzFAVJMpr-d_MGI6kI",
    "AIzaSyA8tfzyjjmvYRt5hYozdLtGOi1bv0swuNY",
    "AIzaSyA5DlWIE5BEBynDonVRVUQNcSxgVikRfJ8",
]

MODEL = "gemini-3-pro-image-preview"
BASE_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
ICONS_DIR = os.path.join(os.path.dirname(__file__), "..", "farmos-poc", "public", "images", "icons")

# Consistent style prefix for all icons
STYLE = (
    "Create a simple, clean flat-style icon illustration. "
    "Use a warm, friendly color palette with soft greens, earthy browns, and gentle accent colors. "
    "The icon should be clear and recognizable at small sizes (32x32 pixels). "
    "Minimalist design with no text, no background elements, centered composition on a pure white background. "
    "Style: modern flat illustration icon, similar to app icons. "
)

ICONS = [
    {
        "name": "dashboard",
        "prompt": STYLE + "Subject: A small cozy farmhouse with an apple tree beside it, representing a farm home dashboard overview.",
    },
    {
        "name": "diagnosis",
        "prompt": STYLE + "Subject: A magnifying glass examining a green leaf, representing pest and disease AI diagnosis for crops.",
    },
    {
        "name": "iot-sensors",
        "prompt": STYLE + "Subject: A soil moisture sensor probe stuck in brown earth with small signal waves emanating from it, representing IoT agricultural sensors.",
    },
    {
        "name": "reviews",
        "prompt": STYLE + "Subject: A speech bubble with a golden star inside, representing customer review analysis and ratings.",
    },
    {
        "name": "documents",
        "prompt": STYLE + "Subject: A white document paper with an official red stamp or seal on it, representing administrative farm documents.",
    },
    {
        "name": "weather",
        "prompt": STYLE + "Subject: A bright sun partially behind a white cloud with a small raindrop, representing weather forecasting and scheduling.",
    },
    {
        "name": "harvest",
        "prompt": STYLE + "Subject: A woven basket filled with red apples, representing harvest yield prediction.",
    },
    {
        "name": "journal",
        "prompt": STYLE + "Subject: An open green notebook or diary with a small pencil, representing a farm journal or logbook.",
    },
    {
        "name": "scenario",
        "prompt": STYLE + "Subject: A circular play button with a small calendar page behind it, representing a scenario timeline playthrough.",
    },
]

key_idx = 0

def generate(prompt, output_path):
    global key_idx

    for attempt in range(len(KEYS)):
        key = KEYS[key_idx]
        url = f"{BASE_URL}?key={key}"

        payload = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["IMAGE", "TEXT"],
            },
        }).encode()

        req = Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read())

            # Extract image from response parts
            candidates = data.get("candidates", [])
            if not candidates:
                print(f"  No candidates, rotating key...")
                key_idx = (key_idx + 1) % len(KEYS)
                continue

            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                if "inlineData" in part:
                    mime = part["inlineData"].get("mimeType", "image/png")
                    b64 = part["inlineData"]["data"]
                    img_bytes = base64.b64decode(b64)

                    # Determine extension from mime
                    ext = ".png" if "png" in mime else ".jpg" if "jpeg" in mime or "jpg" in mime else ".png"
                    final_path = output_path.rsplit(".", 1)[0] + ext

                    with open(final_path, "wb") as f:
                        f.write(img_bytes)
                    print(f"  Saved: {final_path} ({len(img_bytes)/1024:.1f} KB)")
                    return ext

            print(f"  No image in response parts, rotating...")
            key_idx = (key_idx + 1) % len(KEYS)
            continue

        except HTTPError as e:
            if e.code in (429, 403):
                print(f"  Key {key_idx+1} rate limited, rotating...")
                key_idx = (key_idx + 1) % len(KEYS)
                time.sleep(2)
                continue
            else:
                body = e.read().decode()[:300] if e.fp else ""
                print(f"  HTTP {e.code}: {body}")
                key_idx = (key_idx + 1) % len(KEYS)
                continue
        except Exception as e:
            print(f"  Error: {e}")
            key_idx = (key_idx + 1) % len(KEYS)
            continue

    print(f"  FAILED after trying all keys")
    return None


if __name__ == "__main__":
    os.makedirs(ICONS_DIR, exist_ok=True)
    print(f"Generating {len(ICONS)} icons using Nano Banana Pro ({MODEL})")
    print(f"Output: {os.path.abspath(ICONS_DIR)}")
    print()

    results = {}
    success = 0
    for i, icon in enumerate(ICONS, 1):
        print(f"[{i}/{len(ICONS)}] {icon['name']}")
        ext = generate(icon["prompt"], os.path.join(ICONS_DIR, f"{icon['name']}.png"))
        if ext:
            results[icon["name"]] = ext
            success += 1
        time.sleep(2)  # Rate limit buffer between requests

    print(f"\nDone: {success}/{len(ICONS)} icons generated")
    print(f"Extensions: {results}")
