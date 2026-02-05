#!/usr/bin/env -S pnpm tsx
//
// Copyright 2024 DXOS.org
//

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const glob = require('glob');

/**
 * Script to refactor imports from @dxos/schema to @dxos/types
 * Moves Organization, Person, Task, etc. to @dxos/types and removes DataType wrapper
 */

const typesMovedToDxosTypes = [
  'Organization',
  'Person',
  'Task',
  'Project',
  'Event',
  'Message',
  'ContentBlock',
  'Actor',
  'Geo',
];

const typesStayingInSchema = [
  'Collection',
  'View',
  'Text',
  'StoredSchema',
];

async function refactorFile(filePath: string) {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Check if file contains DataType imports or usage
  const hasDataTypeImport = content.includes("import { DataType") || content.includes("import type { DataType");
  const hasDataTypeUsage = content.includes("DataType.");
  
  if (!hasDataTypeImport && !hasDataTypeUsage) {
    return false;
  }

  console.log(`Processing: ${filePath}`);

  // Find all DataType usages and collect the types being used
  const usedTypes = new Set<string>();
  const dataTypePattern = /DataType\.(\w+)\.(\w+)/g;
  let match;
  while ((match = dataTypePattern.exec(content)) !== null) {
    const [, namespace, type] = match;
    if (namespace === type) { // e.g., DataType.Person.Person
      usedTypes.add(namespace);
    }
  }

  // Also check for direct imports from @dxos/schema that need to move
  const schemaImportPattern = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*['"]@dxos\/schema['"]/g;
  const schemaImports: string[] = [];
  while ((match = schemaImportPattern.exec(content)) !== null) {
    const imports = match[1].split(',').map(imp => imp.trim());
    schemaImports.push(...imports);
  }

  // Separate types that need to move vs stay
  const typesToMoveToTypes: string[] = [];
  const typesToKeepInSchema: string[] = [];
  
  usedTypes.forEach(type => {
    if (typesMovedToDxosTypes.includes(type)) {
      typesToMoveToTypes.push(type);
    }
  });
  
  schemaImports.forEach(imp => {
    const cleanImp = imp.replace(/type\s+/, '').trim();
    if (cleanImp !== 'DataType') {
      if (typesMovedToDxosTypes.includes(cleanImp)) {
        if (!typesToMoveToTypes.includes(cleanImp)) {
          typesToMoveToTypes.push(cleanImp);
        }
      } else if (typesStayingInSchema.includes(cleanImp)) {
        typesToKeepInSchema.push(cleanImp);
      }
    }
  });

  // Remove DataType imports
  content = content.replace(/import\s*(?:type\s*)?\{\s*DataType\s*(?:,\s*[^}]+)?\}\s*from\s*['"]@dxos\/schema['"];?\n?/g, '');
  content = content.replace(/import\s*(?:type\s*)?\{\s*([^}]+),\s*DataType\s*\}\s*from\s*['"]@dxos\/schema['"];?\n?/g, "import { $1 } from '@dxos/schema';\n");
  content = content.replace(/import\s*(?:type\s*)?\{\s*([^}]+),\s*DataType\s*,\s*([^}]+)\}\s*from\s*['"]@dxos\/schema['"];?\n?/g, "import { $1, $2 } from '@dxos/schema';\n");

  // Replace DataType.X.X with just X.X
  typesMovedToDxosTypes.forEach(type => {
    const regex = new RegExp(`DataType\\.${type}\\.${type}`, 'g');
    content = content.replace(regex, `${type}.${type}`);
  });

  // Find the right place to add imports (after other imports)
  const importInsertMatch = content.match(/^((?:import[^;]+;\n)*)/m);
  const importInsertIndex = importInsertMatch ? importInsertMatch[0].length : 0;

  // Add new imports from @dxos/types if needed
  if (typesToMoveToTypes.length > 0) {
    const typesImport = `import { ${typesToMoveToTypes.join(', ')} } from '@dxos/types';\n`;
    
    // Check if @dxos/types import already exists
    const existingTypesImport = content.match(/import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*['"]@dxos\/types['"]/);
    if (existingTypesImport) {
      // Merge with existing import
      const existingImports = existingTypesImport[1].split(',').map(imp => imp.trim());
      const allImports = [...new Set([...existingImports, ...typesToMoveToTypes])].sort();
      content = content.replace(existingTypesImport[0], `import { ${allImports.join(', ')} } from '@dxos/types'`);
    } else {
      // Add new import after other imports
      content = content.slice(0, importInsertIndex) + typesImport + content.slice(importInsertIndex);
    }
  }

  // Clean up any schema imports that now only have types that moved
  content = content.replace(/import\s*(?:type\s*)?\{\s*(?:Organization|Person|Task|Project|Event|Message|ContentBlock|Actor|Geo)(?:\s*,\s*(?:Organization|Person|Task|Project|Event|Message|ContentBlock|Actor|Geo))*\s*\}\s*from\s*['"]@dxos\/schema['"];?\n?/g, '');

  // Write back if changed
  if (content !== originalContent) {
    writeFileSync(filePath, content);
    return true;
  }
  
  return false;
}

async function main() {
  console.log('Starting refactoring of @dxos/schema imports...\n');
  
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
    if (await refactorFile(join(process.cwd(), file))) {
      modifiedCount++;
    }
  }

  console.log(`\nRefactoring complete! Modified ${modifiedCount} files.`);
}

main().catch(console.error);