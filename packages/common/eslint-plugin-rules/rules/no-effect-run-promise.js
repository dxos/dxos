//
// Copyright 2025 DXOS.org
//

'use strict';

/**
 * ESLint rule to prevent usage of Effect.runPromise and Effect.runPromiseExit,
 * and suggest runAndForwardErrors instead.
 * @example
 * // bad
 * await Effect.runPromise(myEffect);
 * await Effect.runPromiseExit(myEffect);
 *
 * // good
 * await runAndForwardErrors(myEffect);
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow Effect.runPromise; suggest runAndForwardErrors instead.',
      recommended: true,
    },
    messages: {
      noRunPromise: 'Use runAndForwardErrors from @dxos/effect instead of Effect.runPromise.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        // Check if this is Effect.runPromise or Effect.runPromiseExit
        const isEffectMethod =
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'Effect' &&
          node.callee.property.type === 'Identifier';

        if (isEffectMethod) {
          const methodName = node.callee.property.name;
          if (methodName === 'runPromise') {
            context.report({
              node,
              messageId: 'noRunPromise',
            });
          }
        }
      },
    };
  },
};
