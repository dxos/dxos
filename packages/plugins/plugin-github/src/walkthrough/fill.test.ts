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

  test('leaves a fence the model filled itself, and still shows the real hunks below', () => {
    const body = ['```diff file=src/a.ts lines=10-13', '@@ -1,1 +1,1 @@', '+hand written;', '```', ''].join('\n');
    const { body: filled, covered } = fillWalkthrough(body, PATCH);

    expect(filled).to.contain('+hand written;');
    // Content the model wrote covers nothing: the genuine hunk still has to reach the reader, or a
    // model that ignores the instruction silently replaces the change with its own account of it.
    expect(covered).to.eq(0);
    const [, appended] = filled.split('## Also changed');
    expect(appended).to.contain('+added();');
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

  test('reads a patch with carriage returns', () => {
    const { body: filled, total } = fillWalkthrough(
      ['```diff file=src/b.ts', '```', ''].join('\n'),
      PATCH.split('\n').join('\r\n'),
    );

    // Left in place the carriage returns defeat every anchored match, and the whole patch parses to
    // nothing: an empty walkthrough that claims to have covered everything.
    expect(total).to.eq(3);
    expect(filled).to.contain('+extra();');
  });

  test('selects a pure-deletion hunk by its own reported range', () => {
    const patch = [
      'diff --git a/src/d.ts b/src/d.ts',
      '--- a/src/d.ts',
      '+++ b/src/d.ts',
      '@@ -1,1 +1,1 @@',
      ' first();',
      '@@ -10,2 +10,0 @@',
      '-gone();',
      '-also();',
    ].join('\n');
    const { body: filled, covered } = fillWalkthrough(['```diff file=src/d.ts lines=10', '```', ''].join('\n'), patch);

    // The post-image span of a removal is empty, so a naive overlap test can never match it and the
    // fence silently widens to the whole file.
    expect(covered).to.eq(1);
    const [narrated] = filled.split('## Also changed');
    expect(narrated).to.contain('-gone();');
    expect(narrated).to.contain('lines=10-11');
    // The other hunk is not in the fence; it reappears below, as anything unclaimed does.
    expect(narrated).to.not.contain(' first();');
  });

  test('keeps a fence indented inside a list item', () => {
    const body = ['1. A step:', '', '   ```diff file=src/b.ts', '   ```', ''].join('\n');
    const { body: filled } = fillWalkthrough(body, PATCH);

    // An unindented closing fence ends the list item's block, not the fence. Scoped to the narrated
    // part: the appended section is top-level prose and its fences are correctly unindented.
    const [narrated] = filled.split('## Also changed');
    expect(narrated).to.contain('   ```diff file=src/b.ts');
    expect(narrated).to.contain('   +extra();');
    expect(
      narrated
        .split('\n')
        .filter((line) => line.trim() === '```')
        .every((line) => line.startsWith('   ')),
    ).to.eq(true);
  });

  test('reports a fence that names no file', () => {
    const { body: filled, unresolved } = fillWalkthrough(['```diff', '```', ''].join('\n'), PATCH);

    expect(unresolved).to.have.length(1);
    expect(filled).to.contain('```diff');
  });

  test('names a file the patch changed without changing a line', () => {
    const patch = [
      'diff --git a/old.ts b/new.ts',
      'similarity index 100%',
      'rename from old.ts',
      'rename to new.ts',
    ].join('\n');
    const { body: filled, textless, total } = fillWalkthrough('# Change\n', patch);

    expect(total).to.eq(0);
    expect(textless).to.deep.eq(['new.ts']);
    expect(filled).to.contain('renamed or mode-only');
    expect(filled).to.contain('new.ts');
  });

  test('names generated and binary files without rendering their hunks', () => {
    const patch = [
      PATCH,
      'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
      '--- a/pnpm-lock.yaml',
      '+++ b/pnpm-lock.yaml',
      '@@ -1,1 +1,2 @@',
      ' lockfileVersion: 9',
      '+  resolution: {integrity: sha512-whatever}',
      'diff --git a/assets/logo.png b/assets/logo.png',
      'Binary files a/assets/logo.png and b/assets/logo.png differ',
      '',
    ].join('\n');
    const { body: filled, generated, missed } = fillWalkthrough('# Change\n', patch);

    expect(generated).to.deep.eq(['pnpm-lock.yaml', 'assets/logo.png']);
    expect(filled).to.contain('Generated or binary, not shown: pnpm-lock.yaml, assets/logo.png.');
    expect(filled).to.not.contain('sha512-whatever');
    expect(missed.map((file) => file.path)).to.not.include('pnpm-lock.yaml');
  });

  test('drops a fence that points at a generated file rather than rendering it', () => {
    const patch = [
      PATCH,
      'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
      '--- a/pnpm-lock.yaml',
      '+++ b/pnpm-lock.yaml',
      '@@ -1,1 +1,2 @@',
      ' lockfileVersion: 9',
      '+  resolution: {integrity: sha512-whatever}',
      '',
    ].join('\n');
    const body = '# Change\n\nThe lockfile moved too.\n\n```diff file=pnpm-lock.yaml\n```\n';
    const { body: filled, total } = fillWalkthrough(body, patch);

    expect(filled).to.not.contain('sha512-whatever');
    expect(filled).to.contain('The lockfile moved too.');
    expect(filled).to.contain('Generated or binary, not shown: pnpm-lock.yaml.');
    // The denominator drops with `missed`, or a walkthrough covering everything worth reading
    // would report partial coverage.
    expect(total).to.eq(3);
  });

  test('ends the range at a pure removal that a live hunk shares the fence with', () => {
    const patch = [
      'diff --git a/src/mixed.ts b/src/mixed.ts',
      '--- a/src/mixed.ts',
      '+++ b/src/mixed.ts',
      '@@ -1,1 +1,2 @@',
      ' keep();',
      '+added();',
      // A pure removal spans nothing after the change: `afterEnd` is 98 while it sits at 99.
      '@@ -100,1 +99,0 @@',
      '-gone();',
    ].join('\n');
    const { body: filled } = fillWalkthrough(['```diff file=src/mixed.ts', '```', ''].join('\n'), patch);

    expect(filled).to.contain('lines=1-99');
  });

  test('does not call a textless file unresolved as well', () => {
    const patch = [
      'diff --git a/old.ts b/new.ts',
      'similarity index 100%',
      'rename from old.ts',
      'rename to new.ts',
    ].join('\n');
    const { textless, unresolved } = fillWalkthrough(['```diff file=new.ts', '```', ''].join('\n'), patch);

    // The patch does contain the file; `unresolved` is for one it does not.
    expect(textless).to.deep.eq(['new.ts']);
    expect(unresolved).to.deep.eq([]);
  });

  test('emits no dangling attribute for a file it cannot fill', () => {
    const patch = ['diff --git a/old.ts b/new.ts', 'similarity index 100%'].join('\n');
    const { body: filled } = fillWalkthrough(['```diff file=new.ts', '```', ''].join('\n'), patch);

    // `lines=` with no value is not a fence the editor reads; it renders as a bare code block.
    expect(filled).to.not.contain('lines=\n');
    expect(filled).to.not.contain('lines= ');
  });

  test('merges hunks of a path the patch names twice', () => {
    const patch = [
      'diff --git a/src/x.ts b/src/x.ts',
      '@@ -1,1 +1,2 @@',
      ' a;',
      '+one();',
      'diff --git a/src/x.ts b/src/x.ts',
      '@@ -50,1 +51,2 @@',
      ' b;',
      '+two();',
    ].join('\n');
    const { body: filled, total } = fillWalkthrough(['```diff file=src/x.ts', '```', ''].join('\n'), patch);

    // Keyed by path, the second occurrence would otherwise hide the first from every fence.
    expect(total).to.eq(2);
    expect(filled).to.contain('+one();');
    expect(filled).to.contain('+two();');
  });

  test('quotes a deleted file by the lines it removed', () => {
    const patch = [
      'diff --git a/src/gone.ts b/src/gone.ts',
      'deleted file mode 100644',
      '--- a/src/gone.ts',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-one();',
      '-two();',
    ].join('\n');
    const { body: filled } = fillWalkthrough(['```diff file=src/gone.ts', '```', ''].join('\n'), patch);

    // The post-image is empty, so an after-side range would read as `Lines 0`.
    expect(filled).to.contain('lines=1-2');
  });

  test('falls back to the whole file when the stated range matches no hunk', () => {
    const { body: filled } = fillWalkthrough(['```diff file=src/b.ts lines=400-500', '```', ''].join('\n'), PATCH);
    expect(filled).to.contain('+extra();');
  });
});
