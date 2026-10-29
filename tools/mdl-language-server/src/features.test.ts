//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  codeLenses,
  completions,
  definition,
  diagnostics,
  documentLinks,
  documentSymbols,
  hover,
  inlayHints,
  toDocument,
  verdictLines,
} from './features.ts';
import { FILES, hintText, hoverText } from './testing/fixture.ts';
import { MemoryWorkspace } from './workspace.ts';

const SPEC = 'packages/a/SPEC.mdl';
const REVIEW = 'packages/a/SPEC.review.mdl';

const setup = () => {
  const workspace = new MemoryWorkspace(FILES);
  const document = toDocument(SPEC, FILES[SPEC]);
  /** The position of the first occurrence of `needle`, `offset` characters in. */
  const at = (needle: string, offset = 0, text = document.text) => {
    const index = text.indexOf(needle);
    if (index === -1) {
      throw new Error(`Not found: ${needle}`);
    }
    return toDocument(SPEC, text).lines.positionAt(index + offset);
  };
  return { workspace, document, at };
};

describe('diagnostics', () => {
  test('lints block types and keys whose symbol the checkout lacks', ({ expect }) => {
    const { workspace, document } = setup();
    const found = diagnostics(workspace, document).map(({ source, message }) => [source, message]);
    expect(found).toContainEqual(['mdl/block-type', expect.stringContaining('Unknown block type "widget"')]);
    expect(found).toContainEqual(['mdl/key', '`gone` is not declared in `packages/a/src/a.ts`.']);
    expect(found.filter(([source]) => source === 'mdl/key')).toHaveLength(1);
    // The reference and the dependency resolve through the index.
    expect(found.some(([source]) => source === 'mdl/ref' || source === 'mdl/uses')).toBe(false);
  });

  test('a block type the Extensions table declares is not unknown', ({ expect }) => {
    const { workspace } = setup();
    const text = [
      '## Extensions',
      '',
      '| Term | URI |',
      '| --- | --- |',
      '| `rule` | org.dxos.mdl.rule@1.0 |',
      '',
      '```mdl',
      'rule R-1: Say why.',
      '```',
      '',
    ].join('\n');
    expect(diagnostics(workspace, toDocument('x.mdl', text))).toEqual([]);
  });

  test('checks a review against the spec it judges', ({ expect }) => {
    const { workspace } = setup();
    const found = diagnostics(workspace, toDocument(REVIEW, FILES[REVIEW])).map(({ source, message }) => [
      source,
      message,
    ]);
    expect(found).toEqual([
      ['mdl/verdict', 'Unknown status `sideways`; use one of done, untested, partial, diverged, missing.'],
      ['mdl/verdict', '`Bogus` is not an item of `packages/a/SPEC.mdl`.'],
    ]);
  });
});

describe('links and definitions', () => {
  test('links keys to local files at their symbol and spec references to the other spec', ({ expect }) => {
    const { workspace, document } = setup();
    const targets = documentLinks(workspace, document).map(({ target }) => target);
    expect(targets).toEqual([
      'file:///repo/packages/b/SPEC.mdl',
      'file:///repo/packages/b/SPEC.mdl#L6',
      'file:///repo/packages/a/src/a.ts#L5',
      'file:///repo/packages/a/src/a.ts',
    ]);
  });

  test('relative markdown links open the file they name', ({ expect }) => {
    const workspace = new MemoryWorkspace(FILES);
    const document = toDocument(
      'packages/a/NOTES.mdl',
      'See [B](../b/SPEC.mdl#types), [gone](./x.mdl) and [web](https://x.org).\n',
    );
    expect(documentLinks(workspace, document)).toEqual([
      {
        range: { start: { line: 0, character: 8 }, end: { line: 0, character: 21 } },
        target: 'file:///repo/packages/b/SPEC.mdl',
      },
    ]);
  });

  test('a key to another repository links to GitHub', ({ expect }) => {
    const workspace = new MemoryWorkspace(FILES);
    const document = toDocument('x.mdl', 'See github:dxos/edge/src/main.ts#run.\n');
    expect(documentLinks(workspace, document).map(({ target }) => target)).toEqual([
      'https://github.com/dxos/edge/blob/HEAD/src/main.ts',
    ]);
  });

  test('goes to keys, spec references and item ids', ({ expect }) => {
    const { workspace, document, at } = setup();
    expect(definition(workspace, document, at('a.ts#openThing'))).toEqual({
      uri: 'file:///repo/packages/a/src/a.ts',
      range: { start: { line: 4, character: 0 }, end: { line: 4, character: 0 } },
    });
    expect(definition(workspace, document, at('org.dxos.spec.b#Other', 3))?.range.start.line).toBe(5);
    expect(definition(workspace, document, at('[F-1.2]', 2))).toMatchObject({
      uri: 'file:///repo/packages/a/SPEC.mdl',
      range: { start: { line: 17 } },
    });
  });

  test('a verdict id in a review goes to the item in the spec', ({ expect }) => {
    const { workspace, at } = setup();
    const review = toDocument(REVIEW, FILES[REVIEW]);
    expect(definition(workspace, review, at('verdict Thing', 9, review.text))).toMatchObject({
      uri: 'file:///repo/packages/a/SPEC.mdl',
      range: { start: { line: 21 } },
    });
  });
});

describe('hover', () => {
  test('a key shows the declaration it names', ({ expect }) => {
    const { workspace, document, at } = setup();
    const value = hoverText(hover(workspace, document, at('a.ts#openThing')));
    expect(value).toContain('[packages/a/src/a.ts#openThing](file:///repo/packages/a/src/a.ts#L5)');
    expect(value).toContain("```typescript\nexport const openThing = () => {\n  return 'thing';\n};\n```");
  });

  test('a spec reference shows the block it names', ({ expect }) => {
    const { workspace, document, at } = setup();
    const value = hoverText(hover(workspace, document, at('org.dxos.spec.b#Other', 3)));
    expect(value).toContain('```mdl\ntype Other: Another thing.\n  fields:\n    name: string\n```');
  });

  test("a reviewed item's line shows its verdict", ({ expect }) => {
    const { workspace, document, at } = setup();
    const value = hoverText(hover(workspace, document, at('req F-1.1')));
    expect(value).toContain('**Done** — The action is registered.');
    expect(value).toContain('**Code:** [packages/a/src/a.ts#openThing](file:///repo/packages/a/src/a.ts#L5)');
  });
});

describe('review verdicts', () => {
  test('inlay hints carry the chips the spec viewer shows', ({ expect }) => {
    const { workspace, document } = setup();
    const hints = inlayHints(workspace, document);
    const labels = hints.map(({ label }) => hintText(label));
    expect(labels).toEqual(['✓ Done · </> openThing · </> a.test.ts', '✗ Missing · no code']);
    const [, code] = typeof hints[0].label === 'string' ? [] : hints[0].label;
    expect(code?.location).toMatchObject({ uri: 'file:///repo/packages/a/src/a.ts', range: { start: { line: 4 } } });
  });

  test('code lenses open the code a verdict cites', ({ expect }) => {
    const { workspace, document } = setup();
    expect(
      codeLenses(workspace, document).map(({ range, command }) => [
        range.start.line,
        command?.title,
        command?.arguments,
      ]),
    ).toEqual([
      [16, '✓ Done', undefined],
      [16, '</> openThing', ['file:///repo/packages/a/src/a.ts', 4]],
      [16, '</> a.test.ts', ['file:///repo/packages/a/src/a.test.ts', 0]],
      [21, '✗ Missing', undefined],
      [21, 'no code', undefined],
    ]);
  });

  test('verdict lines feed the margin colours', ({ expect }) => {
    const { workspace, document } = setup();
    expect(verdictLines(workspace, document)).toEqual([
      { line: 16, status: 'done' },
      { line: 21, status: 'missing' },
    ]);
  });
});

describe('completion', () => {
  const labels = (items: { label: string }[]) => items.map(({ label }) => label);

  test('block types on a header line, fields in a body', ({ expect }) => {
    const { workspace } = setup();
    const text = '```mdl\nfe\n```\n\n```mdl\nop doThing\n  in\n```\n';
    const document = toDocument('x.mdl', text);
    expect(labels(completions(workspace, document, { line: 1, character: 2 }))).toContain('feat');
    expect(labels(completions(workspace, document, { line: 6, character: 4 }))).toEqual(
      expect.arrayContaining(['desc', 'input', 'output', 'errors']),
    );
  });

  test('spec ids after uses, and items after a reference', ({ expect }) => {
    const { workspace } = setup();
    const document = toDocument('x.mdl', '```mdl\nuses org\n```\n\nSee org.dxos.spec.b#\n');
    expect(labels(completions(workspace, document, { line: 1, character: 8 }))).toEqual([
      'org.dxos.spec.a',
      'org.dxos.spec.b',
    ]);
    expect(labels(completions(workspace, document, { line: 4, character: 20 }))).toEqual(['Other']);
  });

  test('verdict ids and statuses in a review', ({ expect }) => {
    const { workspace } = setup();
    const document = toDocument(REVIEW, '```mdl\nverdict \n  status: \n```\n');
    expect(labels(completions(workspace, document, { line: 1, character: 8 }))).toEqual([
      'org.dxos.spec.b',
      'F-1',
      'F-1.1',
      'F-1.2',
      'Thing',
      'W-1',
    ]);
    expect(labels(completions(workspace, document, { line: 2, character: 10 }))).toEqual([
      'done',
      'untested',
      'partial',
      'diverged',
      'missing',
    ]);
  });
});

describe('outline', () => {
  test('headings hold blocks, blocks hold their requirements', ({ expect }) => {
    const { document } = setup();
    const outline = (symbols: ReturnType<typeof documentSymbols>): unknown[] =>
      symbols.map(({ name, children }) => (children ? [name, outline(children)] : name));
    expect(outline(documentSymbols(document))).toEqual([
      [
        'Spec A',
        [
          ['Dependencies', ['uses org.dxos.spec.b']],
          ['Features', [['feat F-1', ['F-1.1', 'F-1.2']], 'type Thing', 'widget W-1']],
        ],
      ],
    ]);
  });
});
