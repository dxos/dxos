//
// Copyright 2026 DXOS.org
//

import { HighlightStyle } from '@codemirror/language';
import { highlightTree } from '@lezer/highlight';
import { vscodeDarkStyle, vscodeLightStyle } from '@uiw/codemirror-theme-vscode';
import { describe, test } from 'vitest';

import { printCommands } from '../dsl/print.ts';
import { diagramHighlightStyle } from './highlight.ts';
import { diagram } from './language.ts';
import { diagramDiagnostics } from './lint.ts';
import { diagramLanguage } from './syntax.ts';

describe('diagram language', () => {
  test('the mode composes without an editor', ({ expect }) => {
    expect(diagram({ layout: true })).toBeDefined();
    expect(diagramLanguage.name).toEqual('diagram');
  });

  test('highlighting comes off the tree, not a regex', ({ expect }) => {
    const source = 'object A @ 0,0 {\n  rect box 0,0 10x10 "hi" color=red\n}\n';
    const tree = diagramLanguage.parser.parse(source);
    const names: string[] = [];
    const cursor = tree.cursor();
    do {
      names.push(cursor.name);
    } while (cursor.next());
    expect(names).toContain('ObjectDecl');
    expect(names).toContain('BoxElement');
    expect(names).toContain('AttrName');
    expect(names).not.toContain('⚠');
  });

  //
  // The tags are standard so the theme colours most of a document, but `vscode*Style` defines
  // neither `attributeValue` nor `null` — enum values and the unbound arrow end rendered plain
  // until `diagramHighlightStyle` filled them. Asserting against the real theme is what catches
  // the next tag added to `styleTags` with nothing to colour it.
  //
  for (const [mode, themeStyle] of [
    ['light', vscodeLightStyle],
    ['dark', vscodeDarkStyle],
  ] as const) {
    test(`every token is coloured under the ${mode} theme`, ({ expect }) => {
      expect(uncoloured(SAMPLE, themeStyle)).toEqual([]);
    });
  }
});

/** Every element kind, both arrow forms, a quoted id, a comment — one of each tag the grammar emits. */
const SAMPLE = `# comment
object pkgA @ -24,-24 scale=1 index="a1" {
  rect frame 0,0 248x172 "Package A" color=grey stroke=dashed
  line path 0,0 10,10 closed=true
  arc smile 50,50 20 0..180
  arrow e1 A/box#left -> B/box "extends" head=triangle
  arrow e2 10,20 -> _
  portal "1st" 0,0 10x10 ref="dxn:echo:@:01"
}
`;

/** Non-whitespace runs that no highlighter claimed, as `offset:"text"`. */
const uncoloured = (source: string, themeStyle: Parameters<typeof HighlightStyle.define>[0]): string[] => {
  const covered = new Uint8Array(source.length);
  for (const style of [HighlightStyle.define(themeStyle), diagramHighlightStyle()]) {
    highlightTree(diagramLanguage.parser.parse(source), style, (from, to, classes) => {
      if (classes) {
        covered.fill(1, from, to);
      }
    });
  }

  const gaps: string[] = [];
  let run = '';
  let start = 0;
  for (let index = 0; index <= source.length; index++) {
    const bare = index < source.length && !covered[index] && !/\s/.test(source[index]);
    if (bare) {
      if (!run) {
        start = index;
      }
      run += source[index];
    } else if (run) {
      gaps.push(`${start}:${JSON.stringify(run)}`);
      run = '';
    }
  }
  return gaps;
};

describe('diagram lint', () => {
  test('a clean document reports nothing', ({ expect }) => {
    expect(diagramDiagnostics('object A @ 0,0 {\n  rect box 0,0 10x10\n}\n', { layout: true })).toEqual([]);
  });

  test('parse problems carry a range inside the document', ({ expect }) => {
    const source = 'object A @ 0,0 {\n  rect box 0,0 10x10 colour=red\n}\n';
    const [diagnostic, ...rest] = diagramDiagnostics(source);
    expect(rest).toEqual([]);
    expect(diagnostic.message).toContain('colour');
    expect(source.slice(diagnostic.from, diagnostic.to)).toEqual('colour=red');
  });

  test('a layout error points at the object that caused it, not the top of the file', ({ expect }) => {
    // Two boxes on the same spot — `node-overlap`, which `Diagnostics` reports against both refs.
    const source = printCommands([
      { op: 'upsert-object', object: { id: 'A', origin: { x: 0, y: 0 }, elements: [box('a')] } },
      { op: 'upsert-object', object: { id: 'B', origin: { x: 0, y: 0 }, elements: [box('b')] } },
    ]);
    const overlaps = diagramDiagnostics(source, { layout: true }).filter(({ source: code }) => code === 'node-overlap');
    expect(overlaps.length).toBeGreaterThan(0);
    expect(overlaps[0].from).toBeGreaterThan(0);
    expect(source.slice(overlaps[0].from, overlaps[0].to)).toContain('rect');
  });

  test('layout is not analysed while the document has a syntax error', ({ expect }) => {
    const diagnostics = diagramDiagnostics('object A @ 0,0 {\n  rect box 0,0\n}\n', { layout: true });
    expect(diagnostics.every(({ source }) => source === undefined)).toBe(true);
  });
});

const box = (id: string) => ({ kind: 'rect', id, x: 0, y: 0, w: 100, h: 50 }) as const;
