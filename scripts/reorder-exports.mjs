#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

const TARGET_ORDER = ['source', 'types', 'browser', 'node'];

function reorderExportKeys(exportObj) {
  if (!exportObj || typeof exportObj !== 'object') {
    return exportObj;
  }

  const result = {};

  // First add keys in the target order if they exist.
  for (const key of TARGET_ORDER) {
    if (exportObj.hasOwnProperty(key)) {
      result[key] = exportObj[key];
    }
  }

  // Then add any remaining keys that aren't in the target order.
  for (const key of Object.keys(exportObj)) {
    if (!TARGET_ORDER.includes(key)) {
      result[key] = exportObj[key];
    }
  }

  return result;
}

function processPackageJson(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const pkg = JSON.parse(content);

    if (!pkg.exports) {
      return false; // No exports field, skip.
    }

    let hasChanges = false;
    const newExports = {};

    // Process each export entry.
    for (const [exportPath, exportConfig] of Object.entries(pkg.exports)) {
      const reordered = reorderExportKeys(exportConfig);

      // Check if the order actually changed.
      const originalKeys = Object.keys(exportConfig);
      const newKeys = Object.keys(reordered);
      const orderChanged = !originalKeys.every((key, index) => key === newKeys[index]);

      if (orderChanged) {
        hasChanges = true;
      }

      newExports[exportPath] = reordered;
    }

    if (hasChanges) {
      pkg.exports = newExports;
      writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findPackageJsonFiles(dir, files = []) {
  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules directories.
        if (item !== 'node_modules') {
          findPackageJsonFiles(fullPath, files);
        }
      } else if (item === 'package.json') {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories we can't read.
  }

  return files;
}

function main() {
  console.log('🔍 Finding package.json files with exports...');

  const packageFiles = findPackageJsonFiles(process.cwd());

  console.log(`📦 Found ${packageFiles.length} package.json files`);

  let processedCount = 0;
  let changedCount = 0;

  for (const filePath of packageFiles) {
    // Check if file has exports field.
    try {
      const content = readFileSync(filePath, 'utf8');
      const pkg = JSON.parse(content);

      if (pkg.exports) {
        processedCount++;
        const wasChanged = processPackageJson(filePath);
        if (wasChanged) {
          changedCount++;
          console.log(`✅ Updated: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error reading ${filePath}:`, error.message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   📦 Total package.json files: ${packageFiles.length}`);
  console.log(`   🔍 Files with exports field: ${processedCount}`);
  console.log(`   ✅ Files updated: ${changedCount}`);
  console.log(`   ✨ Files already correct: ${processedCount - changedCount}`);
}

main();
