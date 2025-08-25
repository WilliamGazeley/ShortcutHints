#!/usr/bin/env bash
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"

ZIP_BASE=shortcut-hints
OUTPUT_DIR=builds

# Clean up previous builds
rm -f "${OUTPUT_DIR}/${ZIP_BASE}-chrome.zip" "${OUTPUT_DIR}/${ZIP_BASE}-firefox.zip" || true
rm -rf "${OUTPUT_DIR}/build-temp" || true

mkdir -p "$OUTPUT_DIR"

# Create temporary build directory
echo "Creating universal build..."
mkdir -p "${OUTPUT_DIR}/build-temp"
cp -r src/* "${OUTPUT_DIR}/build-temp/"

# Create zip files for both browsers (same code, different names for clarity)
echo "Creating Chrome zip..."
cd "${OUTPUT_DIR}/build-temp"
zip -r "../${ZIP_BASE}-chrome.zip" . -x "*.DS_Store" "*.git*"

echo "Creating Firefox zip..."
zip -r "../${ZIP_BASE}-firefox.zip" . -x "*.DS_Store" "*.git*"

cd "$DIR"

# Clean up temp directory
rm -rf "${OUTPUT_DIR}/build-temp"

echo "Build complete!"
echo "Chrome extension: ${OUTPUT_DIR}/${ZIP_BASE}-chrome.zip"
echo "Firefox extension: ${OUTPUT_DIR}/${ZIP_BASE}-firefox.zip"
echo ""
echo "Note: Both builds are identical since the extension is now compatible with both browsers."
