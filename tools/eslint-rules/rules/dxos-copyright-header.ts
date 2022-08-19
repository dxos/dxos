/**
 * This file sets you up with with structure needed for an ESLint rule.
 *
 * It leverages utilities from @typescript-eslint to allow TypeScript to
 * provide autocompletions etc for the configuration.
 *
 * Your rule's custom logic will live within the create() method below
 * and you can learn more about writing ESLint rules on the official guide:
 *
 * https://eslint.org/docs/developer-guide/working-with-rules
 *
 * You can also view many examples of existing rules here:
 *
 * https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin/src/rules
 */

import { ESLintUtils, TSESLint } from '@typescript-eslint/utils';

// NOTE: The rule will be available in ESLint configs as "@nrwl/nx/workspace/dxos-copyright-header"
export const RULE_NAME = 'dxos-copyright-header';
const REGEX = /Copyright [0-9]+ DXOS.org/;
const TEMPLATE = [
  '//',
  `// Copyright ${new Date().getFullYear()} DXOS.org`,
  '//',
  '',
].join('\n') + '\n'

export const rule: TSESLint.RuleModule<'missing'> = ESLintUtils.RuleCreator(() => __filename)({
  name: RULE_NAME,
  meta: {
    type: 'layout',
    docs: {
      description: 'enforce copyright header',
      recommended: 'error'
    },
    fixable: 'code',
    schema: [],
    messages: {
      missing: 'Missing copyright header'
    }
  },
  defaultOptions: [],
  create: context => {
    return {
      Program: (node) => {
        if(!context.getSourceCode().text.match(REGEX)) {
          context.report({
            node,
            messageId: 'missing',
            fix: fixer => fixer.insertTextBefore(node, TEMPLATE),
          });
        }
      }
    };
  }
});
