//
// Copyright 2026 DXOS.org
//

/**
 * ESLint rule to prevent bare "." or ".." imports.
 * These imports are ambiguous as they don't explicitly show which file is being imported.
 *
 * @example
 * // ❌ Bad
 * import { foo } from '.';
 * import { bar } from '..';
 *
 * // ✅ Good
 * import { foo } from './index';
 * import { bar } from '../index';
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow bare "." or ".." in import paths',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      bareDotImport: 'Use explicit path instead of bare "{{source}}". Consider "{{suggestion}}" instead.',
    },
  },
  create: (context) => {
    return {
      ImportDeclaration: (node) => {
        const source = node.source.value;

        // Check if the import is exactly "." or ".."
        if (source === '.' || source === '..') {
          context.report({
            node: node.source,
            messageId: 'bareDotImport',
            data: {
              source,
              suggestion: source === '.' ? './index' : '../index',
            },
            fix: (fixer) => {
              const newSource = source === '.' ? './index' : '../index';
              return fixer.replaceText(node.source, `'${newSource}'`);
            },
          });
        }
      },
    };
  },
};
