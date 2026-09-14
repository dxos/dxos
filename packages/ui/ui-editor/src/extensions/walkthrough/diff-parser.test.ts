//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { parseDiff, parseFenceInfo } from './diff-parser.ts';

describe('parseFenceInfo', () => {
  test('reads attributes and a bare path', () => {
    const info = parseFenceInfo('diff src/index.ts lines=66-99 lang=typescript');
    expect(info.language).to.eq('diff');
    expect(info.positional).to.deep.eq(['src/index.ts']);
    expect(info.attributes).to.deep.eq({ lines: '66-99', lang: 'typescript' });
  });

  test('reads a quoted value', () => {
    const info = parseFenceInfo('diff file="src/a b.ts"');
    expect(info.attributes.file).to.eq('src/a b.ts');
  });

  test('reads a fence with no attributes', () => {
    expect(parseFenceInfo('ts').language).to.eq('ts');
    expect(parseFenceInfo('').language).to.eq('');
  });
});

describe('parseDiff', () => {
  test('pairs a replacement across the two columns', () => {
    const diff = parseDiff(
      ['@@ -1,3 +1,3 @@', ' const a = 1;', '-const b = 2;', '+const b = 3;', ' const c = 4;'].join('\n'),
    );

    expect(diff.added).to.eq(1);
    expect(diff.removed).to.eq(1);
    expect(diff.chunks).to.have.length(1);
    expect(diff.chunks[0].rows.map((row) => row.kind)).to.deep.eq(['context', 'changed', 'context']);

    const [, changed] = diff.chunks[0].rows;
    expect(changed.before).to.deep.eq({ number: 2, text: 'const b = 2;' });
    expect(changed.after).to.deep.eq({ number: 2, text: 'const b = 3;' });
  });

  test('leaves the left column empty for a pure insertion', () => {
    const diff = parseDiff(['@@ -10,1 +10,3 @@', ' keep();', '+added();', '+more();'].join('\n'));

    const rows = diff.chunks[0].rows;
    expect(rows.map((row) => row.kind)).to.deep.eq(['context', 'added', 'added']);
    expect(rows[1].before).to.be.undefined;
    expect(rows[1].after).to.deep.eq({ number: 11, text: 'added();' });
    expect(rows[2].after).to.deep.eq({ number: 12, text: 'more();' });
  });

  test('numbers each side from its own chunk header', () => {
    const diff = parseDiff(['@@ -64,3 +66,4 @@', ' a;', ' b;', '+c;', ' d;'].join('\n'));

    const rows = diff.chunks[0].rows;
    expect(rows[0].before?.number).to.eq(64);
    expect(rows[0].after?.number).to.eq(66);
    // The insertion advances only the right-hand numbering.
    expect(rows[3].before?.number).to.eq(66);
    expect(rows[3].after?.number).to.eq(69);
  });

  test('reports the gap above each chunk', () => {
    const diff = parseDiff(['@@ -21,1 +21,1 @@', ' a;', '@@ -50,1 +50,2 @@', ' b;', '+c;'].join('\n'));

    expect(diff.chunks[0].gap).to.eq(20);
    expect(diff.chunks[1].gap).to.eq(28);
  });

  test('keeps the section name from the chunk header', () => {
    const diff = parseDiff(['@@ -1,1 +1,2 @@ export const probe = () => {', ' a;', '+b;'].join('\n'));
    expect(diff.chunks[0].section).to.eq('export const probe = () => {');
  });

  test('takes the file and language from git headers when the fence is bare', () => {
    const diff = parseDiff(
      [
        'diff --git a/src/x.ts b/src/x.ts',
        'index 111..222 100644',
        '--- a/src/x.ts',
        '+++ b/src/x.ts',
        '@@ -1,1 +1,1 @@',
        '-a;',
        '+b;',
      ].join('\n'),
    );

    expect(diff.file).to.eq('src/x.ts');
    expect(diff.language).to.eq('typescript');
    expect(diff.chunks[0].rows).to.have.length(1);
  });

  test('prefers the fence attributes over the git headers', () => {
    const info = parseFenceInfo('diff file=src/y.ts lines=1-2 lang=javascript');
    const diff = parseDiff(['+++ b/src/x.ts', '@@ -1,1 +1,1 @@', '+a;'].join('\n'), info);

    expect(diff.file).to.eq('src/y.ts');
    expect(diff.language).to.eq('javascript');
    expect(diff.range).to.eq('1-2');
  });

  test('derives the shown range from the chunks', () => {
    const diff = parseDiff(['@@ -64,2 +66,3 @@', ' a;', '+b;', ' c;'].join('\n'));
    expect(diff.range).to.eq('66-68');
  });

  test('accepts a body with no chunk header', () => {
    const diff = parseDiff(['-const a = 1;', '+const a = 2;'].join('\n'));

    expect(diff.chunks).to.have.length(1);
    expect(diff.chunks[0].rows.map((row) => row.kind)).to.deep.eq(['changed']);
    // No header means no known position in the file, so nothing to offer expanding.
    expect(diff.chunks[0].gap).to.be.undefined;
  });

  test('drops the blank line the fence leaves behind', () => {
    const diff = parseDiff(['@@ -1,1 +1,2 @@', ' a;', '+b;', ''].join('\n'));
    expect(diff.chunks[0].rows).to.have.length(2);
  });
});
