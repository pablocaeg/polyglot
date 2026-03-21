#!/usr/bin/env bash
#
# Download Wiktionary + FreeDict dumps for all supported languages.
# Usage: ./scripts/dict/01-download.sh [DATA_DIR]
#
set -euo pipefail

DATA_DIR="${1:-./data/raw}"
mkdir -p "$DATA_DIR/wiktionary" "$DATA_DIR/freedict"

LANGS=(pl es en fr de it pt)

echo "=== Downloading Wiktionary dumps ==="
for lang in "${LANGS[@]}"; do
  url="https://dumps.wikimedia.org/${lang}wiktionary/latest/${lang}wiktionary-latest-pages-articles.xml.bz2"
  dest="$DATA_DIR/wiktionary/${lang}wiktionary-pages-articles.xml.bz2"

  if [ -f "$dest" ]; then
    echo "  [$lang] Already exists, skipping: $dest"
    continue
  fi

  echo "  [$lang] Downloading $url ..."
  curl -L -o "$dest" "$url" || echo "  [$lang] WARNING: download failed"
done

echo ""
echo "=== Downloading FreeDict TEI dictionaries ==="
# Key bilingual pairs with English as pivot
PAIRS=(
  "eng-spa" "eng-pol" "eng-fra" "eng-deu" "eng-ita" "eng-por"
  "spa-eng" "pol-eng" "fra-eng" "deu-eng" "ita-eng" "por-eng"
)

for pair in "${PAIRS[@]}"; do
  url="https://github.com/freedict/fd-dictionaries/releases/latest/download/${pair}.tei.tar.xz"
  dest="$DATA_DIR/freedict/${pair}.tei.tar.xz"

  if [ -f "$dest" ]; then
    echo "  [$pair] Already exists, skipping: $dest"
    continue
  fi

  echo "  [$pair] Downloading $url ..."
  curl -L -o "$dest" "$url" 2>/dev/null || echo "  [$pair] WARNING: download failed (may not exist)"
done

echo ""
echo "Done. Raw data in: $DATA_DIR"
echo ""
echo "Next steps:"
echo "  1. Install wiktextract: pip install wiktextract"
echo "  2. Run: npx tsx scripts/dict/02-parse-wiktionary.ts"
