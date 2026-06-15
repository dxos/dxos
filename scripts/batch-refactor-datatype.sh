#!/bin/bash
#
# Copyright 2024 DXOS.org
#

set -euo pipefail

# Script to refactor DataType imports in batches
# This script processes files one by one, replacing DataType imports

# Types that move to @dxos/types
TYPES_TO_MOVE="Organization|Person|Task|Project|Event|Message|ContentBlock|Actor|Geo"

# Types that stay in @dxos/schema
TYPES_TO_STAY="Collection|View|Text"

# Function to process a single file
process_file() {
  local file="$1"
  echo "Processing: $file"
  
  # Create a temporary file
  local temp_file=$(mktemp)
  
  # Read the file
  local content=$(<"$file")
  
  # Check if file contains DataType
  if [[ ! "$content" =~ DataType ]]; then
    return 0
  fi
  
  # Start building the new content
  cp "$file" "$temp_file"
  
  # Replace DataType.X.X patterns for types moving to @dxos/types
  for type in Organization Person Task Project Event Message ContentBlock Actor Geo; do
    sed -i '' "s/DataType\\.${type}\\.${type}/${type}.${type}/g" "$temp_file"
    sed -i '' "s/DataType\\.${type}\\([^.]\)/${type}\\1/g" "$temp_file"
  done
  
  # Replace DataType.X.X patterns for types staying in @dxos/schema
  for type in Collection View Text; do
    sed -i '' "s/DataType\\.${type}\\.${type}/${type}.${type}/g" "$temp_file"
    sed -i '' "s/DataType\\.${type}\\([^.]\)/${type}\\1/g" "$temp_file"
  done
  
  # Extract types used
  local types_used=""
  for type in Organization Person Task Project Event Message ContentBlock Actor Geo; do
    if grep -q "${type}\\." "$temp_file" || grep -q "${type}[^a-zA-Z]" "$temp_file"; then
      types_used="$types_used $type"
    fi
  done
  
  local schema_types_used=""
  for type in Collection View Text; do
    if grep -q "${type}\\." "$temp_file" || grep -q "${type}[^a-zA-Z]" "$temp_file"; then
      schema_types_used="$schema_types_used $type"
    fi
  done
  
  # Remove DataType from @dxos/schema imports
  sed -i '' 's/import \(.*\){ \(.*\)DataType\(.*\) } from .@dxos\/schema./import \1{ \2\3 } from '\''@dxos\/schema'\''/' "$temp_file"
  sed -i '' 's/import \(.*\){  *} from .@dxos\/schema.;//' "$temp_file"
  sed -i '' 's/, *DataType//g' "$temp_file"
  sed -i '' 's/DataType, *//g' "$temp_file"
  sed -i '' 's/{ *DataType *}/{ }/g' "$temp_file"
  
  # Remove types that moved from schema imports
  for type in Organization Person Task Project Event Message ContentBlock Actor Geo; do
    sed -i '' "s/, *${type}//g" "$temp_file"
    sed -i '' "s/${type}, *//g" "$temp_file"
    sed -i '' "s/{ *${type} *}/{ }/g" "$temp_file"
  done
  
  # Add @dxos/types import if needed
  if [[ -n "$types_used" ]]; then
    # Check if @dxos/types import exists
    if ! grep -q "from '@dxos/types'" "$temp_file"; then
      # Find where to insert the import (after other imports)
      local last_import_line=$(grep -n "^import" "$temp_file" | tail -1 | cut -d: -f1)
      if [[ -n "$last_import_line" ]]; then
        # Create import statement
        local import_list=$(echo $types_used | tr ' ' '\n' | sort | tr '\n' ',' | sed 's/,$//' | sed 's/,/, /g')
        sed -i '' "${last_import_line}a\\
import { ${import_list} } from '@dxos/types';
" "$temp_file"
      fi
    else
      # Merge with existing import
      local existing_imports=$(grep "from '@dxos/types'" "$temp_file" | sed -n 's/.*{ *\([^}]*\) *}.*/\1/p')
      local all_imports="$existing_imports"
      for type in $types_used; do
        if [[ ! "$existing_imports" =~ $type ]]; then
          all_imports="$all_imports, $type"
        fi
      done
      all_imports=$(echo "$all_imports" | tr ',' '\n' | sed 's/^ *//' | sort -u | tr '\n' ',' | sed 's/,$//' | sed 's/,/, /g')
      sed -i '' "s/import { [^}]* } from '@dxos\/types'/import { $all_imports } from '@dxos\/types'/" "$temp_file"
    fi
  fi
  
  # Add schema types import if needed and not already there
  if [[ -n "$schema_types_used" ]]; then
    local existing_schema_imports=$(grep "from '@dxos/schema'" "$temp_file" | sed -n 's/.*{ *\([^}]*\) *}.*/\1/p' | head -1)
    if [[ -n "$existing_schema_imports" ]]; then
      # Merge with existing
      local all_schema_imports="$existing_schema_imports"
      for type in $schema_types_used; do
        if [[ ! "$existing_schema_imports" =~ $type ]]; then
          all_schema_imports="$all_schema_imports, $type"
        fi
      done
      all_schema_imports=$(echo "$all_schema_imports" | tr ',' '\n' | sed 's/^ *//' | grep -v '^$' | sort -u | tr '\n' ',' | sed 's/,$//' | sed 's/,/, /g')
      sed -i '' "s/import { [^}]* } from '@dxos\/schema'/import { $all_schema_imports } from '@dxos\/schema'/" "$temp_file"
    else
      # Add new import
      local last_import_line=$(grep -n "^import" "$temp_file" | tail -1 | cut -d: -f1)
      if [[ -n "$last_import_line" ]]; then
        local import_list=$(echo $schema_types_used | tr ' ' '\n' | sort | tr '\n' ',' | sed 's/,$//' | sed 's/,/, /g')
        sed -i '' "${last_import_line}a\\
import { ${import_list} } from '@dxos/schema';
" "$temp_file"
      fi
    fi
  fi
  
  # Clean up empty imports
  sed -i '' '/import { *} from/d' "$temp_file"
  
  # Copy back if changed
  if ! cmp -s "$file" "$temp_file"; then
    cp "$temp_file" "$file"
    echo "  ✓ Modified"
    return 1
  else
    echo "  - No changes"
    return 0
  fi
}

# Main execution
echo "Starting DataType import refactoring..."

# Get all files that need processing
files=$(rg "import.*DataType.*from.*@dxos/schema" -g "*.ts" -g "*.tsx" -l | sort)

if [[ -z "$files" ]]; then
  echo "No files found with DataType imports"
  exit 0
fi

total=$(echo "$files" | wc -l | tr -d ' ')
echo "Found $total files to process"
echo

modified=0
current=0

for file in $files; do
  current=$((current + 1))
  echo "[$current/$total] $file"
  if process_file "$file"; then
    :
  else
    modified=$((modified + 1))
  fi
done

echo
echo "Refactoring complete!"
echo "Modified $modified out of $total files"

# Check which packages need @dxos/types dependency
echo
echo "Checking for packages that need @dxos/types dependency..."
packages_needing_types=""

for file in $files; do
  if grep -q "from '@dxos/types'" "$file"; then
    # Find the package directory
    package_dir=$(echo "$file" | sed -E 's|^(packages/[^/]+/[^/]+).*|\1|')
    if [[ -f "$package_dir/package.json" ]]; then
      if ! grep -q '"@dxos/types"' "$package_dir/package.json"; then
        packages_needing_types="$packages_needing_types $package_dir"
      fi
    fi
  fi
done

if [[ -n "$packages_needing_types" ]]; then
  echo "The following packages need @dxos/types as a dependency:"
  for pkg in $(echo "$packages_needing_types" | tr ' ' '\n' | sort -u); do
    echo "  - $pkg"
  done
  echo
  echo "Run the following commands to add the dependency:"
  for pkg in $(echo "$packages_needing_types" | tr ' ' '\n' | sort -u); do
    echo "  cd $pkg && pnpm add @dxos/types"
  done
fi