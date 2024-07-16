//
// Copyright 2022 DXOS.org
//

const REGEX = /Copyright [0-9]+ DXOS.org/;
const TEMPLATE = ['//', `// Copyright ${new Date().getFullYear()} DXOS.org`, '//', ''].join('\n') + '\n';

module.exports = {
  pattern: REGEX,
  meta: {
    type: 'layout',

    docs: {
      description: 'enforce copyright header',
    },
    fixable: 'code',
    schema: [],
  },
  create: (context) => {
    return {
      Program: (node) => {
        if (!context.getSource().match(REGEX)) {
          context.report({
            node,
            message: 'Missing copyright header',
            fix: (fixer) => fixer.insertTextBefore(node, TEMPLATE),
          });
        }
      },
    };
  },
};
