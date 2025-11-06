#!/usr/bin/env -S pnpm ts-node
//
// Copyright 2024 DXOS.org
//

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const glob = require('glob');

/**
 * Script to fix remaining DataType usage patterns
 */

async function fixFile(filePath: string) {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Track what types we're using
  const typesUsed = new Set<string>();
  const schemaTypes = new Set<string>();
  
  // Find all DataType.X.Y patterns
  const patterns = [
    /DataType\.View\./g,
    /DataType\.Collection\./g,
    /DataType\.Text\./g,
    /DataType\.StoredSchema/g,
    /DataType\.QueryCollection\./g,
    /DataType\.Person\./g,
    /DataType\.Organization\./g,
    /DataType\.Task\./g,
    /DataType\.Project\./g,
    /DataType\.Event\./g,
    /DataType\.Message\./g,
    /DataType\.ContentBlock\./g,
    /DataType\.Actor\./g,
    /DataType\.Geo\./g,
    /DataType\.Employer\./g,
    /DataType\.HasSubject\./g,
    /DataType\.HasConnection\./g,
    /DataType\.HasRelationship\./g,
  ];
  
  // Check which types are used
  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      const typeName = pattern.source.match(/DataType\\\.(\w+)/)?.[1];
      if (typeName) {
        if (['View', 'Collection', 'Text', 'StoredSchema', 'QueryCollection'].includes(typeName)) {
          schemaTypes.add(typeName);
        } else {
          typesUsed.add(typeName);
        }
      }
    }
  });
  
  // Replace DataType.X. with X.
  content = content.replace(/DataType\./g, '');
  
  // Fix imports if we have changes
  if (content !== originalContent) {
    // Remove type DataType imports
    content = content.replace(/,?\s*type\s+DataType(?=\s*[,}])/g, '');
    content = content.replace(/type\s+DataType\s*,/g, '');
    
    // Add necessary imports
    if (typesUsed.size > 0) {
      // Check if we already have imports from @dxos/types
      const typesImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@dxos\/types['"]/);
      if (typesImportMatch) {
        const existingImports = typesImportMatch[1].split(',').map(imp => imp.trim());
        const allImports = [...new Set([...existingImports, ...typesUsed])].sort();
        content = content.replace(typesImportMatch[0], `import { ${allImports.join(', ')} } from '@dxos/types'`);
      } else {
        // Find a good place to add the import
        const lastImportMatch = content.match(/^((?:import[^;]+;\n)*)/m);
        if (lastImportMatch) {
          const importStatement = `import { ${[...typesUsed].sort().join(', ')} } from '@dxos/types';\n`;
          content = content.slice(0, lastImportMatch[0].length) + importStatement + content.slice(lastImportMatch[0].length);
        }
      }
    }
    
    if (schemaTypes.size > 0) {
      // Check if we already have the right imports from @dxos/schema
      const schemaImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@dxos\/schema['"]/);
      if (schemaImportMatch) {
        const existingImports = schemaImportMatch[1].split(',').map(imp => imp.trim());
        const cleanedImports = existingImports.filter(imp => !imp.includes('DataType'));
        const allImports = [...new Set([...cleanedImports, ...schemaTypes])].sort();
        content = content.replace(schemaImportMatch[0], `import { ${allImports.join(', ')} } from '@dxos/schema'`);
      }
    }
  }
  
  // Write back if changed
  if (content !== originalContent) {
    writeFileSync(filePath, content);
    return true;
  }
  
  return false;
}

async function main() {
  console.log('Fixing remaining DataType usage...\n');
  
  const files = glob.sync('packages/**/*.{ts,tsx}', {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
      '**/generated/**',
    ],
  });

  console.log(`Found ${files.length} TypeScript files to check\n`);

  let modifiedCount = 0;
  for (const file of files) {
    if (await fixFile(join(process.cwd(), file))) {
      console.log(`Fixed: ${file}`);
      modifiedCount++;
    }
  }

  console.log(`\nFixed ${modifiedCount} files.`);
}

main().catch(console.error);