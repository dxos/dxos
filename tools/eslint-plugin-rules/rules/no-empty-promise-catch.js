//
// Copyright 2024 DXOS.org
//

'use strict';

const isCatchCallSite = (expression) =>
  expression.type === 'CallExpression' &&
  expression.callee.type === 'MemberExpression' &&
  expression.callee.property.name === 'catch';

export default {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Enforces passing an error handler to promise .catch().',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (isCatchCallSite(node) && node.arguments.length === 0) {
          context.report({
            node,
            message: 'Handler argument required. `undefined` handlers lead to unhandled rejections.',
            fix: (fixer) => {
              return fixer.insertTextAfter(context.sourceCode.getTokenAfter(node.callee), '() => {}');
            },
          });
        }
      },
    };
  },
};
