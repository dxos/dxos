//
// Copyright 2022 DXOS.org
//

/**
 * ESLint rule to transform combined imports from 'effect' into subpath imports.
 * @example
 * // before
 * import { type Schema, SchemaAST } from 'effect';
 * 
 * // after
 * import type * as Schema from 'effect/Schema'
 * import * as SchemaAST from 'effect/SchemaAST'
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce subpath imports for effect modules',
    },
    fixable: 'code',
    schema: [],
  },
  create: (context) => {
    return {
      ImportDeclaration: (node) => {
        // Only process imports from 'effect' package.
        if (node.source.value !== 'effect') {
          return;
        }

        // Skip if it's already using subpath imports.
        if (node.source.value.includes('/')) {
          return;
        }

        // Only process imports with specifiers.
        if (!node.specifiers || node.specifiers.length === 0) {
          return;
        }

        // Only process named imports.
        const hasNamedImports = node.specifiers.some(
          spec => spec.type === 'ImportSpecifier'
        );
        
        if (!hasNamedImports) {
          return;
        }

        // Group specifiers by type.
        const typeImports = [];
        const regularImports = [];

        node.specifiers.forEach((specifier) => {
          if (specifier.type === 'ImportSpecifier') {
            if (specifier.importKind === 'type') {
              typeImports.push({
                imported: specifier.imported.name,
                local: specifier.local.name
              });
            } else {
              regularImports.push({
                imported: specifier.imported.name,
                local: specifier.local.name
              });
            }
          }
        });

        // Report the issue.
        context.report({
          node,
          message: 'Use subpath imports for effect modules',
          fix: (fixer) => {
            const sourceCode = context.getSourceCode();
            const imports = [];

            // Create import statements for type imports.
            typeImports.forEach(({ imported, local }) => {
              const alias = imported !== local ? local : imported;
              imports.push(`import type * as ${alias} from 'effect/${imported}';`);
            });

            // Create import statements for regular imports.
            regularImports.forEach(({ imported, local }) => {
              const alias = imported !== local ? local : imported;
              imports.push(`import * as ${alias} from 'effect/${imported}';`);
            });

            // Get the original import's indentation.
            const importIndent = sourceCode.text.slice(
              node.range[0] - node.loc.start.column,
              node.range[0]
            );

            // Join imports with newline and proper indentation.
            const newImports = imports.join('\n' + importIndent);

            return fixer.replaceText(node, newImports);
          },
        });
      },
    };
  },
};
