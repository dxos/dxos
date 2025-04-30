#!/usr/bin/env zx

import { Project, ts } from 'ts-morph';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
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
        const namedImports = importDecl.getNamedImports();

        // Find and rename matching imports
        namedImports.forEach((namedImport) => {
          const importName = namedImport.getName();
          if (importName === mapping.fromSymbol) {
            // Update import name if different
            if (mapping.fromSymbol !== mapping.toSymbol) {
              namedImport.setName(mapping.toSymbol);
            }

            // Update alias references in the file
            const alias = namedImport.getAliasNode()?.getText() || importName;
            const refs = namedImport.getNameNode().findReferencesAsNodes();
            refs.forEach((ref) => {
              ref.replaceWithText(mapping.toSymbol);
            });

            hasChanges = true;
          }
        });

        // Update package name if different
        if (mapping.fromPackage !== mapping.toPackage) {
          importDecl.setModuleSpecifier(mapping.toPackage);
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
