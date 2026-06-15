#!/bin/bash
#
# Copyright 2024 DXOS.org
#

# Script to remove unused type DataType imports

echo "Removing unused 'type DataType' imports..."

# Find all files with type DataType imports
files=$(rg "import \{ type DataType \} from '@dxos/schema'" -g "*.ts" -g "*.tsx" -l | grep -v scripts)

count=0
for file in $files; do
  # Check if DataType. is actually used in the file
  if ! grep -q "DataType\." "$file"; then
    echo "Removing unused import from: $file"
    # Remove the import line
    sed -i '' "/import { type DataType } from '@dxos\/schema';/d" "$file"
    count=$((count + 1))
  fi
done

echo "Removed unused imports from $count files"