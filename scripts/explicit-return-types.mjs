#!/usr/bin/env node

import { Project, ts } from 'ts-morph';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { globby } from 'globby';
import fs from 'fs/promises';
import chalk from 'chalk';
import { Type } from 'ts-morph';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('verbose', {
    short: 'v',
    description: 'Verbose output',
    type: 'boolean',
    default: false,
  })
  .help()
  .parse();

// Find all TypeScript files
const tsFiles = await globby(['**/*.ts', '**/*.tsx'], {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  gitignore: true,
});

/**
 * @param {string} type
 * @param {string} filePath
 * @param {number} line
 */
function logSkip(type, filePath, line) {
  console.log(chalk.yellow(`✗ SKIP ${chalk.bold(type)}: ${chalk.gray(`${filePath}:${line}`)}`));
}

/**
 * @param {string} type
 * @param {string} filePath
 * @param {number} line
 */
function logSet(type, filePath, line) {
  console.log(chalk.green(`✓ SET  ${chalk.bold(type)}: ${chalk.gray(`${filePath}:${line}`)}`));
}

/**
 * @param {string} filePath
 */
function logSave(filePath) {
  console.log(chalk.magenta(`💾 ${chalk.gray(filePath)}`));
}

// Process each file independently
for (const filePath of tsFiles) {
  if (argv.verbose) {
    console.log(chalk.gray(`🔍 ${filePath}`));
  }

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

  // Process function declarations
  const functions = sourceFile.getFunctions();
  for (const func of functions) {
    // Skip if function already has a return type
    if (func.getReturnTypeNode()) {
      continue;
    }

    // Skip if function is not exported
    if (!func.isExported()) {
      continue;
    }

    // Get the inferred return type
    const returnType = func.getReturnType();
    const returnTypeText = returnType.getText();

    if (!canApplyType(returnType)) {
      logSkip(returnTypeText, filePath, func.getStartLineNumber());
      continue;
    }

    logSet(returnTypeText, filePath, func.getStartLineNumber());

    // Add the return type annotation
    func.setReturnType(returnTypeText);
    hasChanges = true;
  }

  // Process method declarations in classes
  const classes = sourceFile.getClasses();
  for (const cls of classes) {
    const methods = cls.getMethods();
    for (const method of methods) {
      // Skip if method already has a return type
      if (method.getReturnTypeNode()) {
        continue;
      }

      // Skip if method is not public
      if (!method.hasModifier(ts.SyntaxKind.PublicKeyword)) {
        continue;
      }

      // Get the inferred return type
      const returnType = method.getReturnType();
      const returnTypeText = returnType.getText();

      if (!canApplyType(returnType)) {
        logSkip(returnTypeText, filePath, method.getStartLineNumber());
        continue;
      }

      logSet(returnTypeText, filePath, method.getStartLineNumber());

      // Add the return type annotation
      method.setReturnType(returnTypeText);
      hasChanges = true;
    }
  }

  // Save changes if any were made
  if (hasChanges) {
    const updatedContent = sourceFile.getFullText();
    await fs.writeFile(filePath, updatedContent, 'utf8');
    logSave(filePath);
  }
}

console.log(chalk.green('\nDone! All files processed.'));

/**
 * @param {Type<ts.Type>} type
 */
function canApplyType(type) {
  // Handle primitive types using type flags
  const flags = type.getFlags();
  if (
    flags &
    (ts.TypeFlags.Boolean | ts.TypeFlags.String | ts.TypeFlags.Number | ts.TypeFlags.Void | ts.TypeFlags.Undefined)
  ) {
    return true;
  }

  // Handle Promise types using type flags
  if (flags & ts.TypeFlags.Object) {
    const symbol = type.getSymbol();
    if (symbol?.getName() === 'Promise') {
      const typeArgs = type.getTypeArguments();
      if (typeArgs.length === 1) {
        return canApplyType(typeArgs[0]);
      }
      return false;
    }

    // Handle simple object structures
    const properties = type.getProperties();
    if (properties.length > 0 && properties.length <= 4) {
      // Check if all property types are also allowed
      return properties.every((prop) => {
        const propType = prop.getValueDeclaration()?.getType();
        return propType && canApplyType(propType);
      });
    }
  }

  // Handle type references (but not import types)
  if (type.isObject()) {
    const symbol = type.getSymbol();
    if (!symbol) {
      return false;
    }

    // Check if it's an import type
    const declarations = symbol.getDeclarations();
    for (const declaration of declarations) {
      if (ts.isImportTypeNode(declaration)) {
        return false;
      }
    }

    // Check if it's a type reference
    const typeNode = symbol.getDeclarations()[0];
    if (typeNode && (ts.isTypeReferenceNode(typeNode) || ts.isInterfaceDeclaration(typeNode))) {
      return true;
    }
  }

  return false;
}
