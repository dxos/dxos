//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, test } from 'vitest';

import rule from '../rules/no-play-on-default-story.js';

const filename = 'Component.stories.tsx';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('no-play-on-default-story', () => {
  test('accepts a play-free Default and play on other stories', () => {
    ruleTester.run('no-play-on-default-story', rule, {
      valid: [
        { filename, code: 'export const Default: Story = { args: {} };' },
        { filename, code: 'export const AddItem: Story = { args: {}, play: async () => {} };' },
        { filename, code: 'export const Default = { args: {} } satisfies Story;' },
        // Not a story file.
        { filename: 'Component.tsx', code: 'export const Default = { play: async () => {} };' },
        // A non-exported local is not a story.
        { filename, code: 'const Default = { play: async () => {} };' },
        {
          filename: '/repo/packages/foo/src/Component.stories.tsx',
          code: 'export const Default: Story = { play: async () => {} };',
          options: [{ allow: ['foo/src/Component.stories.tsx'] }],
        },
      ],
      invalid: [],
    });
  });

  test('reports play on the Default story', () => {
    ruleTester.run('no-play-on-default-story', rule, {
      valid: [],
      invalid: [
        {
          filename,
          code: 'export const Default: Story = { args: {}, play: async () => {} };',
          errors: [{ messageId: 'playOnDefault' }],
        },
        {
          filename,
          code: 'export const Default = { play() {} } satisfies Story;',
          errors: [{ messageId: 'playOnDefault' }],
        },
        {
          filename,
          code: "export const Default = { 'play': async () => {} } as Story;",
          errors: [{ messageId: 'playOnDefault' }],
        },
      ],
    });
  });
});
