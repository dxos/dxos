//
// Copyright 2026 DXOS.org
//

import { Linter, RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from '../rules/latin1-source.js';

// Built from code points so this file itself stays within Latin-1.
const EM_DASH = String.fromCodePoint(0x2014);
const ARROW = String.fromCodePoint(0x2192);
const ELLIPSIS = String.fromCodePoint(0x2026);
const BOX = String.fromCodePoint(0x2500);
const THUMBS_UP = String.fromCodePoint(0x1f44d);
const KATAKANA = String.fromCodePoint(0x30d1);
const CHECK = String.fromCodePoint(0x2713);
const RIGHT_QUOTE = String.fromCodePoint(0x2019);
const LEFT_DQUOTE = String.fromCodePoint(0x201c);
const RIGHT_DQUOTE = String.fromCodePoint(0x201d);

const languageOptions = {
  ecmaVersion: 2022,
  sourceType: 'module',
  parser: await import('@typescript-eslint/parser'),
  parserOptions: { ecmaFeatures: { jsx: true } },
} as const;

const ruleTester = new RuleTester({ languageOptions });

type Case = {
  code: string;
  /** The source once every suggestion is applied; null when there is none to apply. */
  output: string | null;
  options?: [{ loose: boolean }];
  errors: { messageId: string }[];
};

const CASES: Case[] = [
  {
    code: `// before ${EM_DASH} after ${ARROW} next${ELLIPSIS}\nconst value = 1;`,
    output: '// before - after -> next...\nconst value = 1;',
    errors: [{ messageId: 'wide' }],
  },
  {
    code: `/* ${BOX}${BOX} ${KATAKANA} */\nconst value = 1;`,
    output: '/* -- \\u30D1 */\nconst value = 1;',
    errors: [{ messageId: 'wide' }],
  },
  {
    // Prose reads the same with ASCII punctuation.
    code: `console.error('no events ${EM_DASH} try again${ELLIPSIS}');`,
    output: "console.error('no events - try again...');",
    errors: [{ messageId: 'wide' }],
  },
  {
    code: `const label = \`a ${ARROW} \${name}\`;`,
    output: 'const label = `a -> ${name}`;',
    errors: [{ messageId: 'wide' }],
  },
  {
    // A matched argument keeps its exact value.
    code: `const text = input.replace('${EM_DASH}', '-');`,
    output: "const text = input.replace('\\u2014', '-');",
    errors: [{ messageId: 'wide' }],
  },
  {
    code: `const same = value === '${ARROW}';`,
    output: "const same = value === '\\u2192';",
    errors: [{ messageId: 'wide' }],
  },
  {
    // An ASCII quote must not close the literal it lands in.
    code: `const text = 'don${RIGHT_QUOTE}t' + "say ${LEFT_DQUOTE}hi${RIGHT_DQUOTE}";`,
    output: `const text = 'don\\'t' + "say \\"hi\\"";`,
    errors: [{ messageId: 'wide' }, { messageId: 'wide' }],
  },
  {
    code: `const node = <span title='don${RIGHT_QUOTE}t'>don${RIGHT_QUOTE}t</span>;`,
    output: "const node = <span title='don&apos;t'>don't</span>;",
    errors: [{ messageId: 'wide' }, { messageId: 'wide' }],
  },
  {
    // Truncation code counts on the ellipsis being one character, so outside a message it keeps its value.
    code: `const short = \`\${text.slice(0, 9)}${ELLIPSIS}\`;`,
    output: 'const short = `${text.slice(0, 9)}\\u2026`;',
    errors: [{ messageId: 'wide' }],
  },
  {
    code: `throw new Error('failed ${EM_DASH} retrying' + (later ? '${ELLIPSIS}' : ''));`,
    output: "throw new Error('failed - retrying' + (later ? '...' : ''));",
    errors: [{ messageId: 'wide' }, { messageId: 'wide' }],
  },
  {
    // A glyph has no ASCII stand-in that looks the same.
    code: `const glyphs = { ArrowLeft: '${ARROW}', more: \`${ARROW}\` };`,
    output: "const glyphs = { ArrowLeft: '\\u2192', more: `\\u2192` };",
    errors: [{ messageId: 'wide' }, { messageId: 'wide' }],
  },
  {
    // A template with substitutions is a sentence built around them.
    code: `const line = \`- \${name} ${EM_DASH} \${description}\`;`,
    output: 'const line = `- ${name} - ${description}`;',
    errors: [{ messageId: 'wide' }],
  },
  {
    // Loose code accepts a changed value, so even a compared literal takes ASCII.
    code: `const same = value === '${ARROW}' ? '${ELLIPSIS}' : '${CHECK} ${BOX}${KATAKANA}';`,
    output: "const same = value === '->' ? '...' : 'OK -\\u30D1';",
    options: [{ loose: true }],
    errors: [{ messageId: 'wide' }, { messageId: 'wide' }, { messageId: 'wide' }],
  },
  {
    // A dash placeholder has a one-character twin, and an ellipsis no code truncates around reads the same as `...`.
    code: `const label = value ?? '${EM_DASH}'; const hint = \`\${prefix}${ELLIPSIS}\`; path.join(' ${ARROW} ');`,
    output: "const label = value ?? '-'; const hint = `${prefix}...`; path.join(' -> ');",
    errors: [{ messageId: 'wide' }, { messageId: 'wide' }, { messageId: 'wide' }],
  },
  {
    // A test title is display text.
    code: `test('pinned on first-seen ${EM_DASH} later mutations are ignored', () => {});`,
    output: "test('pinned on first-seen - later mutations are ignored', () => {});",
    errors: [{ messageId: 'wide' }],
  },
  {
    // A regular expression never takes the ASCII spelling: an ASCII `-` would match something else.
    code: `const pattern = /a${EM_DASH}b/;`,
    output: 'const pattern = /a\\u2014b/;',
    errors: [{ messageId: 'wide' }],
  },
  {
    // A tag reads the raw text, so a character with no ASCII spelling arrives through a substitution.
    code: `const label = String.raw\`\${left}${EM_DASH}\${right}${KATAKANA}\`;`,
    output: "const label = String.raw`${left}-${right}${'\\u30D1'}`;",
    errors: [{ messageId: 'wide' }, { messageId: 'wide' }],
  },
  {
    code: `const pattern = /[${ARROW}]/;`,
    output: 'const pattern = /[\\u2192]/;',
    errors: [{ messageId: 'wide' }],
  },
  {
    // Without the u flag a pattern matches UTF-16 code units, so it gets the surrogate pair.
    code: `const pattern = /${THUMBS_UP}/;`,
    output: 'const pattern = /\\uD83D\\uDC4D/;',
    errors: [{ messageId: 'wide' }],
  },
  {
    code: `const pattern = /${THUMBS_UP}/u;`,
    output: 'const pattern = /\\u{1F44D}/u;',
    errors: [{ messageId: 'wide' }],
  },
  {
    // JSX is display text; `->` cannot sit raw in JSX text, so it goes in an expression container.
    code: `const node = <span title='a ${EM_DASH} b'>${ARROW} {value}</span>;`,
    output: "const node = <span title='a - b'>{'->'} {value}</span>;",
    errors: [{ messageId: 'wide' }, { messageId: 'wide' }],
  },
  {
    // A character with no ASCII spelling keeps its value as an entity.
    code: `const node = <span>${KATAKANA}</span>;`,
    output: 'const node = <span>&#x30D1;</span>;',
    errors: [{ messageId: 'wide' }],
  },
  {
    // A plain object key names the same property once quoted.
    code: `const counts = { ${KATAKANA}x: 1 };`,
    output: "const counts = { '\\u30D1x': 1 };",
    errors: [{ messageId: 'wide' }],
  },
  {
    // An identifier has no rewrite that keeps the program the same.
    code: `const caf${KATAKANA} = 1;`,
    output: null,
    errors: [{ messageId: 'code' }],
  },
];

/** Applies every suggestion the rule offers, the way `oxlint --fix-suggestions` does. */
const applySuggestions = ({ code, options }: Case) => {
  const linter = new Linter({ configType: 'flat' });
  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        languageOptions,
        plugins: { dx: { rules: { 'latin1-source': rule } } },
        rules: { 'dx/latin1-source': ['error', ...(options ?? [])] },
      },
    ],
    'source.tsx',
  );
  const fixes = messages.flatMap((message) => message.suggestions?.map((suggestion) => suggestion.fix) ?? []);
  const output = fixes
    .toSorted((left, right) => right.range[0] - left.range[0])
    .reduce((text, fix) => text.slice(0, fix.range[0]) + fix.text + text.slice(fix.range[1]), code);
  return { messages, output: fixes.length > 0 ? output : null };
};

describe('latin1-source', () => {
  it('reports without an autofix and names the replacement', () => {
    ruleTester.run('latin1-source', rule, {
      valid: [
        // Latin-1 itself is fine: one byte per character.
        { code: "const sign = '§ café × 2';" },
        { code: '// Plain ASCII comment.\nconst value = 1;' },
      ],
      invalid: [
        {
          code: `throw new Error('failed ${EM_DASH} retrying');`,
          errors: [
            {
              message:
                'U+2014 in a string makes V8 hold this whole module at two bytes per character; write - instead.',
              suggestions: [{ messageId: 'rewrite', output: "throw new Error('failed - retrying');" }],
            },
          ],
        },
      ],
    });
  });

  it('suggests ASCII for display text and keeps exact values as escapes', ({ expect }) => {
    for (const testCase of CASES) {
      const { messages, output } = applySuggestions(testCase);
      expect(
        messages.map((message) => message.messageId),
        testCase.code,
      ).toEqual(testCase.errors.map((error) => error.messageId));
      expect(messages.every((message) => message.fix === undefined)).toBe(true);
      expect(output, testCase.code).toBe(testCase.output);
    }
  });
});
