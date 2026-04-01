#!/bin/bash
# Generate all FarmOS POC images using Imagen 4 API
set -e

KEY="AIzaSyAoevnCxaWGn_cSDhzFAVJMpr-d_MGI6kI"
KEY2="AIzaSyA8tfzyjjmvYRt5hYozdLtGOi1bv0swuNY"
KEY3="AIzaSyA5DlWIE5BEBynDonVRVUQNcSxgVikRfJ8"
BASE_URL="https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict"
IMAGES_DIR="$(dirname "$0")/../farmos-poc/public/images"

mkdir -p "$IMAGES_DIR/sample-pest"

generate_image() {
  local prompt="$1"
  local output="$2"
  local current_key="$KEY"

  echo "Generating: $output"

  local response
  response=$(curl -s "$BASE_URL?key=$current_key" \
    -H "Content-Type: application/json" \
    -d "{\"instances\":[{\"prompt\":\"$prompt\"}],\"parameters\":{\"sampleCount\":1,\"aspectRatio\":\"1:1\"}}")

  # Check if we got predictions
  local has_predictions
  has_predictions=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if 'predictions' in d and len(d['predictions'])>0 else 'no')" 2>/dev/null || echo "no")

  if [ "$has_predictions" = "yes" ]; then
    echo "$response" | python3 -c "
import sys, json, base64
d = json.load(sys.stdin)
img = base64.b64decode(d['predictions'][0]['bytesBase64Encoded'])
with open('$output', 'wb') as f:
    f.write(img)
print(f'  Saved: {len(img)/1024:.1f} KB')
"
  else
    echo "  FAILED - trying key2..."
    response=$(curl -s "$BASE_URL?key=$KEY2" \
      -H "Content-Type: application/json" \
      -d "{\"instances\":[{\"prompt\":\"$prompt\"}],\"parameters\":{\"sampleCount\":1,\"aspectRatio\":\"1:1\"}}")

    has_predictions=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if 'predictions' in d and len(d['predictions'])>0 else 'no')" 2>/dev/null || echo "no")

    if [ "$has_predictions" = "yes" ]; then
      echo "$response" | python3 -c "
import sys, json, base64
d = json.load(sys.stdin)
img = base64.b64decode(d['predictions'][0]['bytesBase64Encoded'])
with open('$output', 'wb') as f:
    f.write(img)
print(f'  Saved: {len(img)/1024:.1f} KB')
"
    else
      echo "  FAILED with key2 too. Response: $(echo "$response" | head -c 200)"
    fi
  fi
}

# 1. Apple Leaf Spot
generate_image \
  "Close-up photograph of apple tree leaves showing brown circular spots and yellowing, typical symptoms of apple leaf spot disease Marssonina blotch. Multiple round brown lesions with darker borders on green leaves. Realistic agricultural pest diagnosis reference photo, natural outdoor lighting." \
  "$IMAGES_DIR/sample-pest/apple-leaf-spot.jpg"

# 2. Apple Aphid
generate_image \
  "Close-up macro photograph of green aphids clustered on apple tree new growth shoots and leaf undersides. Multiple small green insects visible on tender stems. Realistic agricultural pest identification reference photo, natural lighting." \
  "$IMAGES_DIR/sample-pest/apple-aphid.jpg"

# 3. Apple Anthracnose
generate_image \
  "Close-up photograph of apple fruit showing anthracnose disease symptoms, dark brown to black sunken circular lesions on the red fruit surface. Realistic agricultural disease diagnosis reference photo, natural lighting." \
  "$IMAGES_DIR/sample-pest/apple-anthracnose.jpg"

# 4. Healthy Apple
generate_image \
  "Beautiful healthy red Fuji apple fruit hanging on tree branch with green leaves, no disease or damage. Perfect specimen, vibrant red color, natural sunlight. Agricultural reference photo showing ideal healthy apple condition." \
  "$IMAGES_DIR/sample-pest/apple-healthy.jpg"

# 5. Apple Ring Rot
generate_image \
  "Close-up photograph of apple fruit surface with concentric dark brown alternating ring patterns, ring rot disease symptoms. Realistic agricultural disease diagnosis reference photo, natural lighting." \
  "$IMAGES_DIR/sample-pest/apple-ring-rot.jpg"

# 6. Farmer Avatar
generate_image \
  "Portrait photograph of a friendly elderly Korean male farmer in his 60s wearing a sun hat and work vest, warm smile, standing in an apple orchard. Soft natural lighting, blurred green orchard background. Professional portrait style." \
  "$IMAGES_DIR/farmer-avatar.jpg"

# 7. Farm Hero Image
generate_image \
  "Wide panoramic photograph of a beautiful Korean apple orchard landscape in summer. Rows of apple trees with red fruit, lush green foliage, blue sky with light clouds. Warm golden hour lighting. Hero banner image for farming app." \
  "$IMAGES_DIR/farm-hero.jpg"

echo ""
echo "=== All images generated ==="
ls -lh "$IMAGES_DIR"/*.jpg "$IMAGES_DIR/sample-pest/"*.jpg 2>/dev/null
