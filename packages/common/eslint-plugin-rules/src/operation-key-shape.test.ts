//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from '../rules/operation-key-shape.js';

// The rule derives the expected domain from the package containing the linted file, so the fixture
// is a package on disk named `@dxos/plugin-markdown` — its domain is therefore `markdown`.
const filename = new URL('./__fixtures__/operation-keys/src/MarkdownOperation.ts', import.meta.url).pathname;
const testFile = new URL('./__fixtures__/operation-keys/src/MarkdownOperation.test.ts', import.meta.url).pathname;

const operation = (key: string) => `Operation.make({ meta: { key: DXN.make('${key}') }, input: 1, output: 2 });`;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
  },
});

describe('operation-key-shape', () => {
  it('accepts a key on the canonical shape', () => {
    ruleTester.run('operation-key-shape', rule, {
      valid: [
        { filename, code: operation('org.dxos.operation.markdown.create') },
        { filename, code: operation('org.dxos.operation.markdown.createBranch') },
        // A fixture is held to its root only: it names no package, so it owns no domain.
        { filename: testFile, code: operation('com.example.operation.fib') },
        { filename: testFile, code: operation('com.example.operation.markdown.create') },
        // A key property outside an Operation.make call is none of the rule's business.
        { filename, code: "const meta = { key: DXN.make('whatever') };" },
        // Naming the key once is still greppable, so the const is followed and its value checked.
        {
          filename,
          code: [
            "const KEY = 'org.dxos.operation.markdown.create';",
            'Operation.make({ meta: { key: DXN.make(KEY) }, input: 1, output: 2 });',
          ].join('\n'),
        },
      ],
      invalid: [],
    });
  });

  it('rejects the shapes the convention exists to prevent', () => {
    ruleTester.run('operation-key-shape', rule, {
      valid: [],
      invalid: [
        // The pre-migration shape: kind buried under the plugin.
        {
          filename,
          code: operation('org.dxos.plugin.markdown.operation.create'),
          errors: [{ messageId: 'badShape' }],
        },
        // Domain must be the package, which is what settles two packages sharing a word.
        {
          filename,
          code: operation('org.dxos.operation.assistant.create'),
          errors: [{ messageId: 'wrongDomain' }],
        },
        // The noun repeats the domain, which is already in the derived tool name.
        {
          filename,
          code: operation('org.dxos.operation.markdown.createMarkdown'),
          errors: [{ messageId: 'stutter' }],
        },
        // Verb-first: `markdownCreate` reads as a noun.
        {
          filename,
          code: operation('org.dxos.operation.markdown.documentCreate'),
          errors: [{ messageId: 'unknownVerb' }],
        },
        // De-stuttering can leave a dangling preposition that passes every other check.
        {
          filename,
          code: operation('org.dxos.operation.markdown.convertTo'),
          errors: [{ messageId: 'preposition' }],
        },
        // A helper hides the key from a search for it.
        {
          filename,
          code: "Operation.make({ meta: { key: makeKey('create') }, input: 1, output: 2 });",
          errors: [{ messageId: 'notLiteral' }],
        },
        // A const indirection is followed rather than waved through — it hid a stale key in a test.
        {
          filename,
          code: [
            "const KEY = 'org.dxos.function.markdown.create';",
            'Operation.make({ meta: { key: DXN.make(KEY) }, input: 1, output: 2 });',
          ].join('\n'),
          errors: [{ messageId: 'badShape' }],
        },
        {
          filename: testFile,
          code: [
            "const KEY = 'org.dxos.operation.markdown.create';",
            'Operation.make({ meta: { key: DXN.make(KEY) }, input: 1, output: 2 });',
          ].join('\n'),
          errors: [{ messageId: 'fixtureRoot' }],
        },
        // A fixture must not squat a product namespace.
        {
          filename: testFile,
          code: operation('org.dxos.operation.markdown.create'),
          errors: [{ messageId: 'fixtureRoot' }],
        },
        // ... and product code must not hide behind an example root.
        {
          filename,
          code: operation('com.example.operation.markdown.create'),
          errors: [{ messageId: 'productRoot' }],
        },
      ],
    });
  });
});
