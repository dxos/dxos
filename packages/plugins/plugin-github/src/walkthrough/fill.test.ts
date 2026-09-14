//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { fillWalkthrough } from './fill.ts';
import { parsePatch } from './patch.ts';

const PATCH = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 111..222 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -10,3 +10,4 @@ const first = () => {',
  ' keep();',
  '-was();',
  '+is();',
  '+added();',
  '@@ -90,2 +91,2 @@ const second = () => {',
  ' context();',
  '-old();',
  '+new();',
  'diff --git a/src/b.ts b/src/b.ts',
  'index 333..444 100644',
  '--- a/src/b.ts',
  '+++ b/src/b.ts',
  '@@ -1,1 +1,2 @@',
  ' header();',
  '+extra();',
  '',
].join('\n');

describe('parsePatch', () => {
  test('splits files and hunks with post-change spans', () => {
    const files = parsePatch(PATCH);

    expect(files.map((file) => file.path)).to.deep.eq(['src/a.ts', 'src/b.ts']);
    expect(files[0].hunks).to.have.length(2);
    expect(files[0].hunks[0].afterStart).to.eq(10);
    expect(files[0].hunks[0].afterEnd).to.eq(13);
    expect(files[0].hunks[1].afterStart).to.eq(91);
    expect(files[0].added).to.eq(3);
    expect(files[0].removed).to.eq(2);
    expect(files[1].hunks[0].lines).to.deep.eq([' header();', '+extra();']);
  });

  test('keeps hunk bodies verbatim', () => {
    const [first] = parsePatch(PATCH);
    expect(first.hunks[0].header).to.eq('@@ -10,3 +10,4 @@ const first = () => {');
    expect(first.hunks[0].lines).to.deep.eq([' keep();', '-was();', '+is();', '+added();']);
  });

  test('reads a hunk header with no count', () => {
    const [file] = parsePatch(
      ['diff --git a/src/c.ts b/src/c.ts', '--- a/src/c.ts', '+++ b/src/c.ts', '@@ -5 +5 @@', '-a;', '+b;'].join('\n'),
    );
    expect(file.hunks[0].afterStart).to.eq(5);
    expect(file.hunks[0].afterEnd).to.eq(5);
  });
});

describe('fillWalkthrough', () => {
  test('fills an empty fence from the patch and states the real range', () => {
    const body = ['# Change', '', 'Some prose.', '', '```diff file=src/a.ts lines=10-13', '```', ''].join('\n');
    const { body: filled, covered } = fillWalkthrough(body, PATCH);

    expect(filled).to.contain('```diff file=src/a.ts lines=10-13');
    expect(filled).to.contain('@@ -10,3 +10,4 @@ const first = () => {');
    expect(filled).to.contain('+added();');
    // The second hunk of the same file is outside the requested range, so it is not in the chunk
    // (it reappears below, under the section for what the walkthrough missed).
    const [narrated] = filled.split('## Also changed');
    expect(narrated).to.not.contain('+new();');
    expect(covered).to.eq(1);
  });

  test('takes every hunk of a file when the fence states no range', () => {
    const body = ['```diff file=src/a.ts', '```', ''].join('\n');
    const { body: filled, covered } = fillWalkthrough(body, PATCH);

    expect(filled).to.contain('@@ -10,3 +10,4 @@');
    expect(filled).to.contain('@@ -90,2 +91,2 @@');
    expect(filled).to.contain('lines=10-92');
    expect(covered).to.eq(2);
  });

  test('appends the hunks the prose never mentioned', () => {
    const body = ['# Change', '', '```diff file=src/a.ts lines=10-13', '```', ''].join('\n');
    const { body: filled, missed } = fillWalkthrough(body, PATCH);

    expect(missed.map((file) => file.path)).to.deep.eq(['src/a.ts', 'src/b.ts']);
    expect(filled).to.contain('## Also changed');
    expect(filled).to.contain('2 hunks across 2 files');
    expect(filled).to.contain('+new();');
    expect(filled).to.contain('+extra();');
  });

  test('appends nothing when the walkthrough covers the patch', () => {
    const body = ['```diff file=src/a.ts', '```', '', '```diff file=src/b.ts', '```', ''].join('\n');
    const { body: filled, missed, covered, total } = fillWalkthrough(body, PATCH);

    expect(missed).to.deep.eq([]);
    expect(covered).to.eq(total);
    expect(filled).to.not.contain('## Also changed');
  });

  test('leaves a fence naming an unknown file alone and reports it', () => {
    const body = ['```diff file=src/gone.ts', '```', ''].join('\n');
    const { body: filled, unresolved } = fillWalkthrough(body, PATCH);

    expect(unresolved).to.deep.eq(['src/gone.ts']);
    expect(filled).to.contain('```diff file=src/gone.ts');
  });

  test('does not rewrite a fence the model filled itself', () => {
    const body = ['```diff file=src/a.ts lines=10-13', '@@ -1,1 +1,1 @@', '+hand written;', '```', ''].join('\n');
    const { body: filled } = fillWalkthrough(body, PATCH);

    expect(filled).to.contain('+hand written;');
    expect(filled).to.not.contain('+added();');
  });

  test('accepts a bare path on the fence', () => {
    const { body: filled } = fillWalkthrough(['```diff src/b.ts', '```', ''].join('\n'), PATCH);
    expect(filled).to.contain('+extra();');
  });

  test('leaves prose around a fence untouched', () => {
    const body = ['Before.', '', '```diff file=src/b.ts', '```', '', 'After.', ''].join('\n');
    const { body: filled } = fillWalkthrough(body, PATCH);

    expect(filled.startsWith('Before.\n')).to.eq(true);
    expect(filled).to.contain('\nAfter.');
  });

  test('falls back to the whole file when the stated range matches no hunk', () => {
    const { body: filled } = fillWalkthrough(['```diff file=src/b.ts lines=400-500', '```', ''].join('\n'), PATCH);
    expect(filled).to.contain('+extra();');
  });
});
