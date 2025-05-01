#!/usr/bin/env node

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
  .option('verbose', {
    type: 'boolean',
    default: false,
    description: 'Show detailed logs',
  })
  .help()
  .parse();

function log(...args) {
  if (argv.verbose) {
    console.log(...args);
  }
}

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
    log(`Checking imports in ${filePath} from ${moduleSpecifier}`);

    // Check each rename mapping
    for (const mapping of renameMappings) {
      if (moduleSpecifier === mapping.fromPackage) {
        log(`Found matching package ${mapping.fromPackage}`);
        const namedImports = importDecl.getNamedImports();

        // Find and rename matching imports
        namedImports.forEach((namedImport) => {
          const importName = namedImport.getName();
          const importAlias = namedImport.getAliasNode()?.getText();

          log(`Checking import ${importName}${importAlias ? ` as ${importAlias}` : ''}`);

          if (importName === mapping.fromSymbol) {
            log(`Found matching symbol ${mapping.fromSymbol}`);

            // Update the import name
            if (mapping.fromSymbol !== mapping.toSymbol) {
              namedImport.setName(mapping.toSymbol);
              log(`Renamed import from ${mapping.fromSymbol} to ${mapping.toSymbol}`);
            }

            // Get the local name (either the alias or the original name)
            const localName = importAlias || importName;

            // Find all identifiers in the file
            sourceFile.getDescendants().forEach((node) => {
              if (ts.isIdentifier(node.compilerNode)) {
                const identifier = node.asKind(ts.SyntaxKind.Identifier);
                if (identifier && identifier.getText() === localName) {
                  // Make sure this identifier is not part of the import declaration
                  if (!ts.isImportSpecifier(identifier.getParent()?.compilerNode)) {
                    identifier.replaceWithText(mapping.toSymbol);
                    log(`Renamed usage of ${localName} to ${mapping.toSymbol}`);
                    hasChanges = true;
                  }
                }
              }
            });

            hasChanges = true;
          }
        });

        // Update package name if different
        if (mapping.fromPackage !== mapping.toPackage) {
          importDecl.setModuleSpecifier(mapping.toPackage);
          log(`Updated import from ${mapping.fromPackage} to ${mapping.toPackage}`);
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
