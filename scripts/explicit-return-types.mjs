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
    description: 'Verbose output',
    type: 'boolean',
    default: false,
  })
  .option('debug', {
    description: 'Debug output',
    type: 'boolean',
    default: false,
  })
  .option('dry', {
    description: 'Dry run. No changes will be made.',
    type: 'boolean',
    default: false,
  })
  .help()
  .parse();

const globs = argv._.length > 0 ? argv._ : ['**/*.ts', '**/*.tsx'];

// Find all TypeScript files
const tsFiles = await globby(globs, {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  gitignore: true,
});

console.log(chalk.gray(`Processing ${tsFiles.length} files`));

// Create a single project instance for all files
const project = new Project({
  compilerOptions: {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: true,
  },
});

// Add all source files to the project
// project.addSourceFilesAtPaths(tsFiles);
for (const filePath of tsFiles) {
  if (argv.verbose) {
    console.log(chalk.gray(`⬇️ ${filePath}`));
  }
  project.addSourceFileAtPath(filePath);
}

/**
 * @param {string} type
 * @param {string} filePath
 * @param {number} line
 */
function logSkip(type, filePath, line) {
  console.log(chalk.yellow(`✗ SKIP ${chalk.bold(type)}    ${chalk.gray(`${filePath}:${line}`)}`));
}

/**
 * @param {string} type
 * @param {string} filePath
 * @param {number} line
 */
function logSet(type, filePath, line) {
  console.log(chalk.green(`✓ SET  ${chalk.bold(type)}    ${chalk.gray(`${filePath}:${line}`)}`));
}

/**
 * @param {string} filePath
 */
function logSave(filePath) {
  console.log(chalk.magenta(`💾 ${chalk.gray(filePath)}`));
}

// Process each file
for (const filePath of tsFiles) {
  const sourceFile = project.getSourceFile(filePath);
  if (!sourceFile) continue;

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
    const returnTypeText = returnType.getText(func);

    if (!canApplyType(returnType, func)) {
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

      // Get the inferred return type
      const returnType = method.getReturnType();
      const returnTypeText = returnType.getText(method);

      if (!canApplyType(returnType, method)) {
        logSkip(returnTypeText, filePath, method.getStartLineNumber());
        continue;
      }

      logSet(returnTypeText, filePath, method.getStartLineNumber());

      // Add the return type annotation
      method.setReturnType(returnTypeText);
      hasChanges = true;
    }

    // Process class properties
    const properties = cls.getProperties();
    for (const prop of properties) {
      // Skip if property already has a type
      if (prop.getTypeNode()) {
        continue;
      }

      // Skip if property is not public
      if (!prop.hasModifier(ts.ScriptTarget.PublicKeyword)) {
        continue;
      }

      // Get the inferred property type
      const propType = prop.getType();
      const propTypeText = propType.getText(prop);

      if (!canApplyType(propType, prop)) {
        logSkip(propTypeText, filePath, prop.getStartLineNumber());
        continue;
      }

      logSet(propTypeText, filePath, prop.getStartLineNumber());

      // Add the type annotation
      prop.setType(propTypeText);
      hasChanges = true;
    }

    // Process getters and setters
    const getAccessors = cls.getGetAccessors();
    for (const getter of getAccessors) {
      // Skip if getter already has a return type
      if (getter.getReturnTypeNode()) {
        continue;
      }

      // Skip if getter is not public
      if (!getter.hasModifier(ts.ScriptTarget.PublicKeyword)) {
        continue;
      }

      // Get the inferred return type
      const returnType = getter.getReturnType();
      const returnTypeText = returnType.getText(getter);

      if (!canApplyType(returnType, getter)) {
        logSkip(returnTypeText, filePath, getter.getStartLineNumber());
        continue;
      }

      logSet(returnTypeText, filePath, getter.getStartLineNumber());

      // Add the return type annotation
      getter.setReturnType(returnTypeText);
      hasChanges = true;
    }

    const setAccessors = cls.getSetAccessors();
    for (const setter of setAccessors) {
      // Skip if setter already has a parameter type
      if (setter.getParameters()[0]?.getTypeNode()) {
        continue;
      }

      // Skip if setter is not public
      if (!setter.hasModifier(ts.ScriptTarget.PublicKeyword)) {
        continue;
      }

      // Get the inferred parameter type
      const paramType = setter.getParameters()[0]?.getType();
      if (!paramType) continue;

      const paramTypeText = paramType.getText(setter);

      if (!canApplyType(paramType, setter)) {
        logSkip(paramTypeText, filePath, setter.getStartLineNumber());
        continue;
      }

      logSet(paramTypeText, filePath, setter.getStartLineNumber());

      // Add the parameter type annotation
      setter.getParameters()[0]?.setType(paramTypeText);
      hasChanges = true;
    }
  }

  // Save changes if any were made
  if (hasChanges) {
    if (argv.dry) {
      continue;
    }

    const updatedContent = sourceFile.getFullText();
    await fs.writeFile(filePath, updatedContent, 'utf8');
    logSave(filePath);
  }

  /**
   * @param {Type<ts.Type>} type
   */
  function canApplyType(type, node) {
    const typeNode = project
      .getTypeChecker()
      .compilerObject.typeToTypeNode(type.compilerType, node.compilerNode, ts.NodeBuilderFlags.NoTruncation);
    const text = type.getText(node);

    if (argv.debug) {
      console.log({
        text,
        typeFlags: Object.keys(ts.TypeFlags).filter((flag) => type.getFlags() & ts.TypeFlags[flag]),
        nodeKind: ts.SyntaxKind[typeNode.kind],
        typeNode,
      });
    }

    if (text.includes('import(')) {
      return false;
    }
    if (text.includes('unknown')) {
      return false;
    }
    if (text.includes('any')) {
      return false;
    }

    const result = typeNode ? canApplyTypeNode(typeNode) : undefined;
    if (result !== undefined) {
      return result;
    }

    // Handle primitive types using type flags
    const flags = type.getFlags();
    if (
      flags &
      (ts.TypeFlags.Boolean |
        ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Void |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Null |
        ts.TypeFlags.TypeParameter |
        ts.TypeFlags.ThisType)
    ) {
      return true;
    }

    // Handle union types
    if (flags & ts.TypeFlags.Union) {
      const unionTypes = type.getUnionTypes();
      return unionTypes.every((unionType) => canApplyType(unionType, node));
    }

    // Handle Promise types using type flags
    if (flags & ts.TypeFlags.Object) {
      const symbol = type.getSymbol();
      if (symbol?.getName() === 'Promise') {
        const typeArgs = type.getTypeArguments();
        if (typeArgs.length === 1) {
          return canApplyType(typeArgs[0], node);
        }
        return false;
      }

      // Handle simple object structures
      const properties = type.getProperties();
      if (properties.length > 0 && properties.length <= 4) {
        // Check if all property types are also allowed
        return properties.every((prop) => {
          const propType = prop.getValueDeclaration()?.getType();
          return propType && canApplyType(propType, node);
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

      // Check if it's a type reference or interface
      const typeNode = symbol.getDeclarations()[0];
      if (typeNode && (ts.isTypeReferenceNode(typeNode) || ts.isInterfaceDeclaration(typeNode))) {
        return true;
      }

      // Check if it's a global type (like Error, Date, etc.)
      const globalTypeNames = new Set([
        'Error',
        'Date',
        'RegExp',
        'Map',
        'Set',
        'WeakMap',
        'WeakSet',
        'Array',
        'Promise',
        'Uint8Array',
        'Uint16Array',
        'Uint32Array',
        'Int8Array',
        'Int16Array',
        'Int32Array',
        'Float32Array',
        'Float64Array',
        'ArrayBuffer',
        'DataView',
      ]);

      if (globalTypeNames.has(symbol.getName())) {
        return true;
      }
    }

    return false;
  }
  /**
   * @param {ts.TypeNode} typeNode
   * @returns {boolean | undefined}
   */
  function canApplyTypeNode(typeNode) {
    if (argv.debug) {
      console.log({
        nodeKind: ts.SyntaxKind[typeNode.kind],
        typeNode,
      });
    }

    if (
      [
        ts.SyntaxKind.VoidKeyword,
        ts.SyntaxKind.UndefinedKeyword,
        ts.SyntaxKind.StringKeyword,
        ts.SyntaxKind.NumberKeyword,
        ts.SyntaxKind.BooleanKeyword,
        ts.SyntaxKind.BigIntKeyword,
        ts.SyntaxKind.SymbolKeyword,
        ts.SyntaxKind.NullKeyword,
        ts.SyntaxKind.TrueKeyword,
        ts.SyntaxKind.FalseKeyword,
        ts.SyntaxKind.ThisType,
        ts.SyntaxKind.LiteralType,
      ].includes(typeNode.kind)
    ) {
      return true;
    }

    if (ts.isFunctionTypeNode(typeNode)) {
      return typeNode.parameters.every((param) => canApplyTypeNode(param)) && canApplyTypeNode(typeNode.type);
    }

    if (ts.isTypeReferenceNode(typeNode)) {
      return !typeNode.typeArguments || typeNode.typeArguments.every((arg) => canApplyTypeNode(arg));
    }

    if (ts.isArrayTypeNode(typeNode)) {
      return canApplyTypeNode(typeNode.elementType);
    }

    if (ts.isTupleTypeNode(typeNode)) {
      return typeNode.elements.every((element) => canApplyTypeNode(element));
    }

    if (ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.every((type) => canApplyTypeNode(type));
    }

    return undefined;
  }
}

console.log(chalk.green('\nDone! All files processed.'));
