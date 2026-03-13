//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

const DIRECTIVE_TEXT = '@import-as-namespace';
const DIRECTIVE_LINE_REGEX = /^\s*\/\/\s*@import-as-namespace\s*$/m;
const PASCAL_CASE_REGEX = /^[A-Z][a-zA-Z0-9]*$/;
const TS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * ESLint rule to enforce namespace imports for modules annotated with `// @import-as-namespace`.
 *
 * When a module contains the `// @import-as-namespace` directive comment, this rule enforces:
 * - The module filename is PascalCase (e.g. `LanguageModel.ts`).
 * - All imports of the module use namespace form: `import * as LanguageModel from './LanguageModel'`.
 * - The namespace name matches the filename (without extension).
 * - Re-exports use namespace form: `export * as LanguageModel from './LanguageModel'`.
 *
 * @example
 * // In LanguageModel.ts:
 * // @import-as-namespace
 * export const foo = 1;
 *
 * // ❌ Bad (in another file):
 * import { foo } from './LanguageModel';
 * export { foo } from './LanguageModel';
 * export * from './LanguageModel';
 *
 * // ✅ Good:
 * import * as LanguageModel from './LanguageModel';
 * export * as LanguageModel from './LanguageModel';
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce namespace imports for modules marked with @import-as-namespace',
    },
    fixable: 'code',
    schema: [],
    messages: {
      filenameMustBePascalCase:
        'Module marked with @import-as-namespace must have a PascalCase filename. Got: "{{filename}}".',
      mustUseNamespaceImport:
        'Module "{{source}}" is marked @import-as-namespace. Use: `import * as {{namespace}} from \'{{source}}\'`.',
      namespaceMustMatchFilename: 'Namespace import name "{{actual}}" must match filename "{{expected}}".',
      mustUseNamespaceReexport:
        'Module "{{source}}" is marked @import-as-namespace. Use: `export * as {{namespace}} from \'{{source}}\'`.',
    },
  },
  create: (context) => {
    const directiveCache = new Map();

    const fileHasDirective = (filePath) => {
      if (directiveCache.has(filePath)) {
        return directiveCache.get(filePath);
      }
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = DIRECTIVE_LINE_REGEX.test(content);
        directiveCache.set(filePath, result);
        return result;
      } catch {
        directiveCache.set(filePath, false);
        return false;
      }
    };

    const resolveRelativeImport = (source, currentFile) => {
      if (!source.startsWith('.')) {
        return null;
      }
      const dir = path.dirname(currentFile);
      const resolved = path.resolve(dir, source);
      for (const ext of TS_EXTENSIONS) {
        const filePath = resolved + ext;
        if (fs.existsSync(filePath)) {
          return filePath;
        }
      }
      for (const ext of TS_EXTENSIONS) {
        const filePath = path.join(resolved, 'index' + ext);
        if (fs.existsSync(filePath)) {
          return filePath;
        }
      }
      return null;
    };

    const namespaceFromSource = (source) => {
      const parts = source.split('/');
      const last = parts[parts.length - 1];
      return last.replace(/\.\w+$/, '');
    };

    const buildImportFix = (fixer, node, source, expectedNamespace, context) => {
      const fixes = [];
      const importKeyword = node.importKind === 'type' ? 'import type' : 'import';
      fixes.push(fixer.replaceText(node, `${importKeyword} * as ${expectedNamespace} from '${source}';`));

      try {
        const declaredVars = context.sourceCode.getDeclaredVariables(node);
        for (const variable of declaredVars) {
          for (const ref of variable.references) {
            if (ref.identifier.range[0] >= node.range[0] && ref.identifier.range[1] <= node.range[1]) {
              continue;
            }
            fixes.push(fixer.replaceText(ref.identifier, `${expectedNamespace}.${variable.name}`));
          }
        }
      } catch {
        // Scope analysis unavailable; fix import declaration only.
      }

      return fixes;
    };

    return {
      Program: (node) => {
        const comments = context.sourceCode.getAllComments();
        const hasDirective = comments.some(
          (comment) => comment.type === 'Line' && comment.value.trim() === DIRECTIVE_TEXT,
        );
        if (!hasDirective) {
          return;
        }
        const filename = path.basename(context.getFilename());
        const stem = filename.replace(/\.\w+$/, '');
        if (!PASCAL_CASE_REGEX.test(stem)) {
          context.report({
            node,
            messageId: 'filenameMustBePascalCase',
            data: { filename },
          });
        }
      },

      ImportDeclaration: (node) => {
        const source = String(node.source.value);
        if (!source.startsWith('.')) {
          return;
        }
        if (!node.specifiers || node.specifiers.length === 0) {
          return;
        }

        const currentFile = context.getFilename();
        const resolved = resolveRelativeImport(source, currentFile);
        if (!resolved) {
          return;
        }
        if (!fileHasDirective(resolved)) {
          return;
        }

        const expectedNamespace = namespaceFromSource(source);

        const isNamespaceImport =
          node.specifiers.length === 1 && node.specifiers[0].type === 'ImportNamespaceSpecifier';

        if (!isNamespaceImport) {
          context.report({
            node,
            messageId: 'mustUseNamespaceImport',
            data: { source, namespace: expectedNamespace },
            fix: (fixer) => buildImportFix(fixer, node, source, expectedNamespace, context),
          });
          return;
        }

        const actual = node.specifiers[0].local.name;
        if (actual !== expectedNamespace) {
          context.report({
            node,
            messageId: 'namespaceMustMatchFilename',
            data: { actual, expected: expectedNamespace },
            fix: (fixer) => {
              const importKeyword = node.importKind === 'type' ? 'import type' : 'import';
              return fixer.replaceText(node, `${importKeyword} * as ${expectedNamespace} from '${source}';`);
            },
          });
        }
      },

      ExportNamedDeclaration: (node) => {
        if (!node.source) {
          return;
        }
        const source = String(node.source.value);
        if (!source.startsWith('.')) {
          return;
        }

        const currentFile = context.getFilename();
        const resolved = resolveRelativeImport(source, currentFile);
        if (!resolved) {
          return;
        }
        if (!fileHasDirective(resolved)) {
          return;
        }

        const expectedNamespace = namespaceFromSource(source);
        const exportKeyword = node.exportKind === 'type' ? 'export type' : 'export';
        context.report({
          node,
          messageId: 'mustUseNamespaceReexport',
          data: { source, namespace: expectedNamespace },
          fix: (fixer) => {
            return fixer.replaceText(node, `${exportKeyword} * as ${expectedNamespace} from '${source}';`);
          },
        });
      },

      ExportAllDeclaration: (node) => {
        if (!node.source) {
          return;
        }
        const source = String(node.source.value);
        if (!source.startsWith('.')) {
          return;
        }

        const currentFile = context.getFilename();
        const resolved = resolveRelativeImport(source, currentFile);
        if (!resolved) {
          return;
        }
        if (!fileHasDirective(resolved)) {
          return;
        }

        const expectedNamespace = namespaceFromSource(source);

        if (node.exported) {
          const actual = node.exported.name;
          if (actual !== expectedNamespace) {
            context.report({
              node,
              messageId: 'namespaceMustMatchFilename',
              data: { actual, expected: expectedNamespace },
              fix: (fixer) => {
                return fixer.replaceText(node, `export * as ${expectedNamespace} from '${source}';`);
              },
            });
          }
          return;
        }

        context.report({
          node,
          messageId: 'mustUseNamespaceReexport',
          data: { source, namespace: expectedNamespace },
          fix: (fixer) => {
            return fixer.replaceText(node, `export * as ${expectedNamespace} from '${source}';`);
          },
        });
      },
    };
  },
};
