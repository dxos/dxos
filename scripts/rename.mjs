#!/usr/bin/env node

/**
 * Symbol Renaming Script
 *
 * This script renames TypeScript import symbols across the entire monorepo.
 * It updates both the imported symbol name and its package source, creating
 * separate import statements when necessary.
 *
 * Usage:
 *   ./scripts/rename.mjs --rename=oldPackage#oldSymbol:newPackage#newSymbol
 *
 * Multiple renames can be specified:
 *   ./scripts/rename.mjs \
 *     --rename=pkg-a#foo:pkg-b#bar \
 *     --rename=pkg-x#old:pkg-y#new
 *
 * Examples:
 *
 * 1. Basic symbol rename:
 *    Input:  import { foo } from 'pkg-a';
 *    Command: ./scripts/rename.mjs --rename=pkg-a#foo:pkg-b#bar
 *    Output: import { bar } from 'pkg-b';
 *
 * 2. Preserving other imports:
 *    Input:  import { foo, other } from 'pkg-a';
 *    Command: ./scripts/rename.mjs --rename=pkg-a#foo:pkg-b#bar
 *    Output: import { other } from 'pkg-a';
 *            import { bar } from 'pkg-b';
 *
 * Features:
 * - Processes all .ts and .tsx files in the monorepo
 * - Respects .gitignore
 * - Preserves other imports in the same import statement
 * - Only modifies files that contain the exact symbol to be renamed
 * - Creates separate import statements for renamed symbols
 */

import { Project, ts } from 'ts-morph';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { globby } from 'globby';
import fs from 'fs/promises';
import chalk from 'chalk';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('rename', {
    array: true,
    description: 'Rename mappings in format: oldPackage#oldSymbol:newPackage#newSymbol',
    type: 'string',
    demandOption: true,
  })
  .help()
  .parse();

// Parse rename mappings
const renameMappings = argv.rename.map((mapping) => {
  const [from, to] = mapping.split(':');
  const [fromPackage, fromSymbol] = from.split('#');
  const [toPackage, toSymbol] = to.split('#');
  return {
    fromPackage,
    fromSymbol,
    toPackage,
    toSymbol,
  };
});

// Find all TypeScript files
const tsFiles = await globby(['**/*.ts', '**/*.tsx'], {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  gitignore: true,
});

// Process each file independently
for (const filePath of tsFiles) {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: ts.ScriptTarget.Latest,
    },
  });

  // Read file content
  const fileContent = await fs.readFile(filePath, 'utf8');
  const sourceFile = project.createSourceFile(filePath, fileContent);
  let hasChanges = false;

  // Process each import declaration
  sourceFile.getImportDeclarations().forEach((importDecl) => {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();

    // Check each rename mapping
    for (const mapping of renameMappings) {
      if (moduleSpecifier === mapping.fromPackage) {
        // Find matching named imports
        const namedImports = importDecl.getNamedImports();
        const matchingImport = namedImports.find((imp) => imp.getName() === mapping.fromSymbol);

        if (matchingImport) {
          // Remove the old import
          matchingImport.remove();

          // If this was the only import, remove the entire declaration
          if (namedImports.length === 1) {
            importDecl.remove();
          }

          // Add a new import declaration for the renamed symbol
          sourceFile.addImportDeclaration({
            moduleSpecifier: mapping.toPackage,
            namedImports: [{ name: mapping.toSymbol }],
          });

          hasChanges = true;
        }
      }
    }
  });

  // Save changes if any were made
  if (hasChanges) {
    const updatedContent = sourceFile.getFullText();
    await fs.writeFile(filePath, updatedContent, 'utf8');
    console.log(chalk.green(`✓ Updated ${filePath}`));
  }
}

console.log(chalk.green('\nDone! All files processed.'));
