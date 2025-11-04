//
// Copyright 2025 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

/**
 * ESLint rule to enforce namespace imports for modules marked with @import-as-namespace.
 * 
 * Enforces:
 * 1. Modules with `// @import-as-namespace` must be imported as `import * as Mod from './Mod'`
 * 2. Modules with this comment must have UpperCamelCase names
 * 3. Namespace aliases must match the file name
 * 4. Exports must use `export * as Mod from './Mod'` syntax
 * 
 * @example
 * // In Foo.ts:
 * // @import-as-namespace
 * export const bar = 1;
 * 
 * // Correct usage:
 * import * as Foo from './Foo';
 * export * as Foo from './Foo';
 * 
 * // Incorrect:
 * import { bar } from './Foo';
 * import Foo from './Foo';
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce namespace imports for modules marked with @import-as-namespace',
    },
    fixable: 'code',
    schema: [],
  },
  create: (context) => {
    const sourceCode = context.getSourceCode();
    const currentFilename = context.getFilename();
    
    // Cache to store which files have @import-as-namespace comment.
    const namespaceModuleCache = new Map();
    
    /**
     * Check if a file has the @import-as-namespace comment.
     * @param {string} filePath - Absolute path to the file.
     * @returns {boolean} True if the file has the comment.
     */
    const hasNamespaceComment = (filePath) => {
      if (namespaceModuleCache.has(filePath)) {
        return namespaceModuleCache.get(filePath);
      }
      
      try {
        if (!fs.existsSync(filePath)) {
          namespaceModuleCache.set(filePath, false);
          return false;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        // Look for @import-as-namespace in comments at the beginning of the file.
        const hasComment = /^\s*(\/\/|\/\*[\s\S]*?\*\/)*\s*\/\/\s*@import-as-namespace/m.test(content);
        namespaceModuleCache.set(filePath, hasComment);
        return hasComment;
      } catch (err) {
        namespaceModuleCache.set(filePath, false);
        return false;
      }
    };
    
    /**
     * Resolve import source to absolute file path.
     * @param {string} source - Import source string.
     * @returns {string|null} Absolute file path or null if not resolvable.
     */
    const resolveImportPath = (source) => {
      // Only handle relative imports.
      if (!source.startsWith('.')) {
        return null;
      }
      
      const currentDir = path.dirname(currentFilename);
      const basePath = path.resolve(currentDir, source);
      
      // Try common extensions.
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs'];
      
      // Try exact path first.
      if (fs.existsSync(basePath)) {
        const stat = fs.statSync(basePath);
        if (stat.isFile()) return basePath;
        // If directory, try index files.
        for (const ext of extensions) {
          const indexPath = path.join(basePath, `index${ext}`);
          if (fs.existsSync(indexPath)) return indexPath;
        }
      }
      
      // Try with extensions.
      for (const ext of extensions) {
        const withExt = basePath + ext;
        if (fs.existsSync(withExt)) return withExt;
      }
      
      return null;
    };
    
    /**
     * Get the expected namespace name from a file path.
     * @param {string} filePath - Absolute path to the file.
     * @returns {string} Expected namespace name.
     */
    const getExpectedNamespaceName = (filePath) => {
      const basename = path.basename(filePath);
      // Remove extension.
      const nameWithoutExt = basename.replace(/\.[^.]+$/, '');
      // Remove 'index' prefix if present.
      return nameWithoutExt === 'index' ? path.basename(path.dirname(filePath)) : nameWithoutExt;
    };
    
    /**
     * Check if a name is UpperCamelCase.
     * @param {string} name - Name to check.
     * @returns {boolean} True if UpperCamelCase.
     */
    const isUpperCamelCase = (name) => {
      return /^[A-Z][a-zA-Z0-9]*$/.test(name);
    };
    
    /**
     * Check if current file has @import-as-namespace comment.
     */
    const checkCurrentFileNaming = () => {
      const text = sourceCode.getText();
      if (!/^\s*(\/\/|\/\*[\s\S]*?\*\/)*\s*\/\/\s*@import-as-namespace/m.test(text)) {
        return;
      }
      
      const expectedName = getExpectedNamespaceName(currentFilename);
      if (!isUpperCamelCase(expectedName)) {
        context.report({
          loc: { line: 1, column: 0 },
          message: `Module with @import-as-namespace must have UpperCamelCase name, got '${expectedName}'`,
        });
      }
    };
    
    return {
      Program: () => {
        checkCurrentFileNaming();
      },
      
      ImportDeclaration: (node) => {
        const source = node.source.value;
        const resolvedPath = resolveImportPath(source);
        
        if (!resolvedPath || !hasNamespaceComment(resolvedPath)) {
          return;
        }
        
        const expectedName = getExpectedNamespaceName(resolvedPath);
        
        // Check if it's a namespace import.
        const hasNamespaceImport = node.specifiers.some(
          (spec) => spec.type === 'ImportNamespaceSpecifier'
        );
        
        if (!hasNamespaceImport) {
          // Not a namespace import - report error.
          context.report({
            node,
            message: `Module '${source}' must be imported as namespace: import * as ${expectedName} from '${source}'`,
            fix: (fixer) => {
              // Determine if there's a type-only import.
              const hasTypeImports = node.specifiers.some(
                (spec) => spec.type === 'ImportSpecifier' && spec.importKind === 'type'
              );
              const isTypeOnly = node.importKind === 'type' || 
                (hasTypeImports && node.specifiers.every(
                  (spec) => spec.type === 'ImportSpecifier' && spec.importKind === 'type'
                ));
              
              const typePrefix = isTypeOnly ? 'type ' : '';
              const newImport = `import ${typePrefix}* as ${expectedName} from '${source}';`;
              return fixer.replaceText(node, newImport);
            },
          });
          return;
        }
        
        // It's a namespace import - check if the alias matches.
        const namespaceSpec = node.specifiers.find(
          (spec) => spec.type === 'ImportNamespaceSpecifier'
        );
        
        if (namespaceSpec && namespaceSpec.local.name !== expectedName) {
          context.report({
            node: namespaceSpec,
            message: `Namespace alias must match file name: expected '${expectedName}', got '${namespaceSpec.local.name}'`,
            fix: (fixer) => {
              const isTypeOnly = node.importKind === 'type';
              const typePrefix = isTypeOnly ? 'type ' : '';
              const newImport = `import ${typePrefix}* as ${expectedName} from '${source}';`;
              return fixer.replaceText(node, newImport);
            },
          });
        }
      },
      
      ExportAllDeclaration: (node) => {
        if (!node.source) return;
        
        const source = node.source.value;
        const resolvedPath = resolveImportPath(source);
        
        if (!resolvedPath || !hasNamespaceComment(resolvedPath)) {
          return;
        }
        
        const expectedName = getExpectedNamespaceName(resolvedPath);
        
        // Check if it's a namespace export (export * as Name).
        if (!node.exported) {
          // It's `export * from './Mod'` - should be `export * as Mod from './Mod'`.
          context.report({
            node,
            message: `Module '${source}' must be exported as namespace: export * as ${expectedName} from '${source}'`,
            fix: (fixer) => {
              const typePrefix = node.exportKind === 'type' ? 'type ' : '';
              const newExport = `export ${typePrefix}* as ${expectedName} from '${source}';`;
              return fixer.replaceText(node, newExport);
            },
          });
          return;
        }
        
        // It's `export * as Name from './Mod'` - check if the name matches.
        if (node.exported.name !== expectedName) {
          context.report({
            node: node.exported,
            message: `Namespace export name must match file name: expected '${expectedName}', got '${node.exported.name}'`,
            fix: (fixer) => {
              const typePrefix = node.exportKind === 'type' ? 'type ' : '';
              const newExport = `export ${typePrefix}* as ${expectedName} from '${source}';`;
              return fixer.replaceText(node, newExport);
            },
          });
        }
      },
      
      ExportNamedDeclaration: (node) => {
        if (!node.source) return;
        
        const source = node.source.value;
        const resolvedPath = resolveImportPath(source);
        
        if (!resolvedPath || !hasNamespaceComment(resolvedPath)) {
          return;
        }
        
        const expectedName = getExpectedNamespaceName(resolvedPath);
        
        // Named exports like `export { foo } from './Mod'` are not allowed.
        context.report({
          node,
          message: `Module '${source}' must be exported as namespace: export * as ${expectedName} from '${source}'`,
          fix: (fixer) => {
            const typePrefix = node.exportKind === 'type' ? 'type ' : '';
            const newExport = `export ${typePrefix}* as ${expectedName} from '${source}';`;
            return fixer.replaceText(node, newExport);
          },
        });
      },
    };
  },
};
