#!/usr/bin/env -S pnpm tsx
//
// Copyright 2024 DXOS.org
//

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Script to refactor ALL remaining DataType imports from @dxos/schema to @dxos/types
 * This is a comprehensive version that handles all patterns
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

interface RefactorResult {
  filePath: string;
  success: boolean;
  error?: string;
}

async function addDependencyIfNeeded(filePath: string): Promise<boolean> {
  // Find the nearest package.json
  const pathParts = filePath.split('/');
  let packageDir: string | null = null;
  
  for (let i = pathParts.length - 1; i >= 0; i--) {
    if (pathParts[i] === 'packages' || pathParts[i] === 'tools') {
      // Go one more level to get the actual package directory
      const testDir = pathParts.slice(0, i + 2).join('/');
      try {
        const packageJsonPath = join(testDir, 'package.json');
        readFileSync(packageJsonPath);
        packageDir = testDir;
        break;
      } catch {
        // Continue searching
      }
    }
  }
  
  if (!packageDir) {
    return false;
  }
  
  const packageJsonPath = join(packageDir, 'package.json');
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (!deps['@dxos/types']) {
      console.log(`Adding @dxos/types dependency to ${packageDir}`);
      execSync(`pnpm add @dxos/types`, { cwd: packageDir });
      return true;
    }
  } catch (error) {
    console.warn(`Failed to check dependencies for ${packageDir}:`, error);
  }
  
  return false;
}

async function refactorFile(filePath: string): Promise<RefactorResult> {
  try {
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Check if file contains DataType imports or usage
    const hasDataTypeImport = content.includes("import { DataType") || content.includes("import type { DataType");
    const hasDataTypeUsage = content.includes("DataType.");
    
    if (!hasDataTypeImport && !hasDataTypeUsage) {
      return { filePath, success: false };
    }

    console.log(`Processing: ${filePath}`);

    // Find all DataType usages and collect the types being used
    const usedTypes = new Set<string>();
    const dataTypePatterns = [
      /DataType\.(\w+)\.(\w+)/g,  // DataType.Person.Person
      /DataType\.(\w+)/g,         // DataType.Person (might be just namespace)
    ];
    
    for (const pattern of dataTypePatterns) {
      let match: RegExpExecArray | null;
      const contentCopy = content;
      while ((match = pattern.exec(contentCopy)) !== null) {
        const namespace = match[1];
        // Check if this is a type that should be moved
        if (typesMovedToDxosTypes.includes(namespace)) {
          usedTypes.add(namespace);
        } else if (typesStayingInSchema.includes(namespace)) {
          usedTypes.add(namespace);
        }
      }
    }

    // Also check for direct imports from @dxos/schema that need to move
    const schemaImportPattern = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*['"]@dxos\/schema['"]/g;
    const schemaImports: string[] = [];
    let match2: RegExpExecArray | null;
    while ((match2 = schemaImportPattern.exec(content)) !== null) {
      const imports = match2[1].split(',').map((imp: string) => imp.trim());
      schemaImports.push(...imports);
    }

    // Separate types that need to move vs stay
    const typesToMoveToTypes: string[] = [];
    const typesToKeepInSchema: string[] = [];
    
    usedTypes.forEach(type => {
      if (typesMovedToDxosTypes.includes(type)) {
        typesToMoveToTypes.push(type);
      } else if (typesStayingInSchema.includes(type)) {
        typesToKeepInSchema.push(type);
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
          if (!typesToKeepInSchema.includes(cleanImp)) {
            typesToKeepInSchema.push(cleanImp);
          }
        }
      }
    });

    // Remove DataType from imports, keeping other imports intact
    content = content.replace(
      /import\s*(?:type\s*)?\{\s*([^}]*)\s*\}\s*from\s*['"]@dxos\/schema['"];?\n?/g,
      (_match, imports: string) => {
        const importList = imports.split(',').map((imp: string) => imp.trim());
        const filteredImports = importList.filter((imp: string) => {
          const cleanImp = imp.replace(/type\s+/, '').trim();
          return cleanImp !== 'DataType' && !typesMovedToDxosTypes.includes(cleanImp);
        });
        
        if (filteredImports.length === 0) {
          return ''; // Remove the entire import
        }
        
        return `import { ${filteredImports.join(', ')} } from '@dxos/schema';\n`;
      }
    );

    // Replace DataType.X.X with just X.X or X for types moving to @dxos/types
    typesMovedToDxosTypes.forEach(type => {
      // Replace DataType.Type.Type with Type.Type
      const regex1 = new RegExp(`DataType\\.${type}\\.${type}`, 'g');
      content = content.replace(regex1, `${type}.${type}`);
      
      // Replace DataType.Type with just Type (for namespace usage)
      const regex2 = new RegExp(`DataType\\.${type}(?!\\.)`, 'g');
      content = content.replace(regex2, type);
    });

    // For types staying in schema, we need to import them directly
    typesStayingInSchema.forEach(type => {
      if (usedTypes.has(type)) {
        // Replace DataType.Type.Type with Type.Type
        const regex1 = new RegExp(`DataType\\.${type}\\.${type}`, 'g');
        content = content.replace(regex1, `${type}.${type}`);
        
        // Replace DataType.Type with just Type (for namespace usage)
        const regex2 = new RegExp(`DataType\\.${type}(?!\\.)`, 'g');
        content = content.replace(regex2, type);
      }
    });

    // Add new imports from @dxos/types if needed
    if (typesToMoveToTypes.length > 0) {
      const typesImport = `import { ${typesToMoveToTypes.sort().join(', ')} } from '@dxos/types';\n`;
      
      // Check if @dxos/types import already exists
      const existingTypesImport = content.match(/import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*['"]@dxos\/types['"]/);
      if (existingTypesImport) {
        // Merge with existing import
        const existingImports = existingTypesImport[1].split(',').map(imp => imp.trim());
        const allImports = [...new Set([...existingImports, ...typesToMoveToTypes])].sort();
        content = content.replace(existingTypesImport[0], `import { ${allImports.join(', ')} } from '@dxos/types'`);
      } else {
        // Find the right place to add the import (after other imports)
        const importMatches = [...content.matchAll(/^import[^;]+;\n/gm)];
        if (importMatches.length > 0) {
          const lastImport = importMatches[importMatches.length - 1];
          const insertIndex = lastImport.index! + lastImport[0].length;
          content = content.slice(0, insertIndex) + typesImport + content.slice(insertIndex);
        } else {
          // Add at the beginning after copyright header
          const copyrightMatch = content.match(/^\/\/\n\/\/[^/]+Copyright[^/]+\n\/\/\n\n/);
          if (copyrightMatch) {
            const insertIndex = copyrightMatch.index! + copyrightMatch[0].length;
            content = content.slice(0, insertIndex) + typesImport + '\n' + content.slice(insertIndex);
          } else {
            content = typesImport + content;
          }
        }
      }
    }

    // Write back if changed
    if (content !== originalContent) {
      writeFileSync(filePath, content);
      
      // Add @dxos/types dependency if needed
      if (typesToMoveToTypes.length > 0) {
        await addDependencyIfNeeded(filePath);
      }
      
      return { filePath, success: true };
    }
    
    return { filePath, success: false };
  } catch (error) {
    return { filePath, success: false, error: String(error) };
  }
}

async function main() {
  console.log('Starting comprehensive refactoring of @dxos/schema DataType imports...\n');
  
  // Get the list of files from the initial search
  const files = execSync(`rg "import.*DataType.*from.*@dxos/schema" -g "*.ts" -g "*.tsx" -l | sort`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);

  console.log(`Found ${files.length} files with DataType imports to refactor\n`);

  const results: RefactorResult[] = [];
  for (const file of files) {
    const result = await refactorFile(join(process.cwd(), file));
    results.push(result);
  }

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => r.error).length;

  console.log(`\nRefactoring complete!`);
  console.log(`- Modified: ${successCount} files`);
  console.log(`- Unchanged: ${results.length - successCount - errorCount} files`);
  if (errorCount > 0) {
    console.log(`- Errors: ${errorCount} files`);
    results.filter(r => r.error).forEach(r => {
      console.error(`  ${r.filePath}: ${r.error}`);
    });
  }

  // Run linter on modified files
  if (successCount > 0) {
    console.log('\nRunning linter on modified files...');
    const modifiedFiles = results.filter(r => r.success).map(r => r.filePath);
    
    // Group by package for more efficient linting
    const packageGroups = new Map<string, string[]>();
    modifiedFiles.forEach(file => {
      const pathParts = file.split('/');
      for (let i = pathParts.length - 1; i >= 0; i--) {
        if (pathParts[i] === 'packages' || pathParts[i] === 'tools') {
          const packageName = pathParts[i + 1];
          if (!packageGroups.has(packageName)) {
            packageGroups.set(packageName, []);
          }
          packageGroups.get(packageName)!.push(file);
          break;
        }
      }
    });

    for (const [packageName] of packageGroups) {
      console.log(`\nLinting ${packageName}...`);
      try {
        execSync(`moon run ${packageName}:lint -- --fix`, { stdio: 'inherit' });
      } catch (error) {
        console.error(`Failed to lint ${packageName}`);
      }
    }
  }
}

main().catch(console.error);