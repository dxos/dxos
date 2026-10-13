//
// Copyright 2026 DXOS.org
//

import path from 'node:path';

/**
 * The `Default` story is the resting state a reviewer opens, so it carries no `play` function — a `play` would mutate
 * the story before anyone sees it. Interaction tests go on a separate named story.
 *
 * @example
 * // ❌ Bad
 * export const Default: Story = { args, play: async ({ canvasElement }) => { … } };
 *
 * // ✅ Good
 * export const Default: Story = { args };
 * export const AddItem: Story = { args, play: async ({ canvasElement }) => { … } };
 */

const STORY_FILE = /\.stories\.[jt]sx?$/;

/** Unwraps `{ … } satisfies Story` and `{ … } as Story` to the object literal. */
const unwrap = (node) => {
  while (node && (node.type === 'TSSatisfiesExpression' || node.type === 'TSAsExpression')) {
    node = node.expression;
  }
  return node;
};

const keyName = (property) =>
  property.type === 'Property' && !property.computed
    ? (property.key.name ?? property.key.value)
    : property.type === 'Property' && property.key.type === 'Literal'
      ? property.key.value
      : undefined;

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'the Default story has no play function; interaction tests go on a separate named story',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            description: 'File paths (matched as a path suffix) exempt from the rule.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      playOnDefault:
        'The `Default` story is the resting state and must not have a `play` function. Move the interaction test to a separate named story.',
    },
  },
  create: (context) => {
    const filePath = context.filename.split(path.sep).join('/');
    if (!STORY_FILE.test(filePath)) {
      return {};
    }
    const allow = context.options[0]?.allow ?? [];
    if (allow.some((entry) => filePath === entry || filePath.endsWith(`/${entry}`))) {
      return {};
    }

    return {
      'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name="Default"]': (node) => {
        const init = unwrap(node.init);
        if (init?.type !== 'ObjectExpression') {
          return;
        }
        const play = init.properties.find((property) => keyName(property) === 'play');
        if (play) {
          context.report({ node: play, messageId: 'playOnDefault' });
        }
      },
    };
  },
};
