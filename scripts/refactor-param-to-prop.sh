#!/bin/bash

# Refactor *Param/*Params suffix to *Prop/*Props in function parameters
# This script changes parameter names like fooParam to fooProp

set -e

echo "Starting refactoring: Param/Params -> Prop/Props"

# Find all TypeScript files
files=$(find packages -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.next/*")

# Counter for files changed
count=0

for file in $files; do
  # Create a temporary file
  temp_file=$(mktemp)
  
  # Perform the replacements:
  # 1. Change *Params to *Props (must come first to avoid double conversion)
  # 2. Change *Param to *Prop
  sed -E \
    -e 's/([a-zA-Z_][a-zA-Z0-9_]*)Params\b/\1Props/g' \
    -e 's/([a-zA-Z_][a-zA-Z0-9_]*)Param\b/\1Prop/g' \
    "$file" > "$temp_file"
  
  # Check if file was modified
  if ! cmp -s "$file" "$temp_file"; then
    mv "$temp_file" "$file"
    ((count++))
    echo "Modified: $file"
  else
    rm "$temp_file"
  fi
done

echo ""
echo "Refactoring complete!"
echo "Modified $count files"
