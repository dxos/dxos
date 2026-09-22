//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { fillWalkthrough } from './fill.ts';
import { type Dimension, meanScore, proseOf, scoreWalkthrough } from './score.ts';

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
  'diff --git a/src/b.ts b/src/b.ts',
  'index 333..444 100644',
  '--- a/src/b.ts',
  '+++ b/src/b.ts',
  '@@ -1,1 +1,2 @@',
  ' header();',
  '+extra();',
  '',
].join('\n');

const GOOD = [
  '# Retry the first call',
  '',
  'The first call fails when the socket is cold, so it now runs twice.',
  '',
  '## The retry',
  '',
  'A cold socket rejects the first write, and the caller had no way to tell that apart from a real',
  'failure. The second attempt runs on a warmed socket.',
  '',
  '```diff file=src/a.ts lines=10-13',
  '```',
  '',
  '## The header',
  '',
  'The header line moved out of the handler so both attempts send the same one.',
  '',
  '```diff file=src/b.ts lines=1-2',
  '```',
  '',
].join('\n');

const dimension = (dimensions: Dimension[], name: string): Dimension => {
  const found = dimensions.find((entry) => entry.name === name);
  expect(found, name).to.exist;
  return found!;
};

describe('scoreWalkthrough', () => {
  test('a walkthrough that follows the prompt scores full marks', () => {
    const { correctness, readability } = scoreWalkthrough(GOOD, PATCH);

    expect(meanScore(correctness)).to.eq(1);
    expect(dimension(readability, 'slop-free').score).to.eq(1);
    expect(dimension(readability, 'sentence-length').score).to.eq(1);
    expect(dimension(readability, 'prose-density').score).to.eq(1);
  });

  test('a fence naming a file the patch does not contain fails, with the path as evidence', () => {
    const body = GOOD.replace('file=src/b.ts', 'file=src/gone.ts');
    const { correctness } = scoreWalkthrough(body, PATCH);

    expect(dimension(correctness, 'fences-resolve').score).to.eq(0.5);
    expect(dimension(correctness, 'fences-resolve').evidence).to.deep.eq(['src/gone.ts']);
  });

  test('a fence carrying lines the patch never had is invented, not filled', () => {
    const body = GOOD.replace('```diff file=src/a.ts lines=10-13\n```', '```diff file=src/a.ts\n+invented();\n```');
    const { correctness } = scoreWalkthrough(body, PATCH);

    expect(dimension(correctness, 'fences-authentic').score).to.eq(0.5);
  });

  test('prose that cites a symbol the change never touches is ungrounded', () => {
    const body = GOOD.replace('The retry', 'The retry').replace(
      'The second attempt runs on a warmed socket.',
      'The second attempt runs through `retryPolicy.backoff()`.',
    );
    const { correctness } = scoreWalkthrough(body, PATCH);

    expect(dimension(correctness, 'citations-grounded').score).to.eq(0);
    expect(dimension(correctness, 'citations-grounded').evidence).to.deep.eq(['retryPolicy.backoff()']);
  });

  test('a number the diff never shows is an invented claim', () => {
    const body = GOOD.replace(
      'The second attempt runs on a warmed socket.',
      'The second attempt runs after 250 milliseconds.',
    );
    const { correctness } = scoreWalkthrough(body, PATCH);

    expect(dimension(correctness, 'numbers-grounded').score).to.eq(0);
    expect(dimension(correctness, 'numbers-grounded').evidence).to.deep.eq(['250']);
  });

  test('a number the diff does show is grounded, sentence-final or not', () => {
    const patch = PATCH.replace('+added();', '+const attempts = 5;');
    const body = GOOD.replace('so it now runs twice.', 'so the count is 5.');
    expect(dimension(scoreWalkthrough(body, patch).correctness, 'numbers-grounded').score).to.eq(1);
  });

  test('an inverted or unmatched line range is invalid, even though the fill hides it', () => {
    const body = GOOD.replace('lines=10-13', 'lines=394-224');
    const { correctness } = scoreWalkthrough(body, PATCH);

    expect(dimension(correctness, 'ranges-valid').score).to.eq(0.5);
    expect(dimension(correctness, 'ranges-valid').evidence).to.deep.eq(['src/a.ts lines=394-224']);
  });

  test('a number the code writes with separators or in another unit is grounded', () => {
    const patch = PATCH.replace('+added();', '+const timeout = 10_000;');
    const body = GOOD.replace('so it now runs twice.', 'so it gives the socket 10 seconds.');

    expect(dimension(scoreWalkthrough(body, patch).correctness, 'numbers-grounded').score).to.eq(1);
  });

  test('a fence carrying another file\u2019s lines is invented, not filled', () => {
    // The lines are real, the file is wrong: the reader is pointed at code that never changed here.
    const body = GOOD.replace('```diff file=src/a.ts lines=10-13\n```', '```diff file=src/a.ts\n+extra();\n```');
    const { correctness } = scoreWalkthrough(body, PATCH);

    expect(dimension(correctness, 'fences-authentic').score).to.eq(0.5);
    expect(dimension(correctness, 'fences-authentic').evidence).to.deep.eq(['src/a.ts']);
  });

  test('a body with no H1 loses half the structure mark', () => {
    const { correctness } = scoreWalkthrough(GOOD.replace('# Retry the first call', '## Retry the first call'), PATCH);
    expect(dimension(correctness, 'structure').score).to.eq(0.5);
  });

  test('generated vocabulary and title case are graded down', () => {
    const body = GOOD.replace('## The retry', '## The Crucial Retry Mechanism').replace(
      'A cold socket rejects',
      'Additionally, this robust change serves as a testament to how a cold socket rejects',
    );
    const { readability } = scoreWalkthrough(body, PATCH);

    expect(dimension(readability, 'slop-free').score).to.be.lessThan(1);
    expect(dimension(readability, 'slop-free').evidence).to.include.members(['additionally', 'robust', 'serves as']);
    expect(dimension(readability, 'sentence-case-headings').score).to.be.lessThan(1);
  });

  test('a bold label restating its line is an inline header', () => {
    const body = GOOD.replace('The header line moved', '**Performance:** the header line moved');
    const { readability } = scoreWalkthrough(body, PATCH);

    expect(dimension(readability, 'no-inline-headers').score).to.be.lessThan(1);
  });

  test('a sentence the reader has to backtrack through is graded down', () => {
    const body = GOOD.replace(
      'The header line moved out of the handler so both attempts send the same one.',
      `The header line moved out of the handler ${'and then something else happened again '.repeat(
        4,
      )}so both attempts send the same one.`,
    );
    const { readability } = scoreWalkthrough(body, PATCH);

    expect(dimension(readability, 'sentence-length').score).to.be.lessThan(1);
  });

  test('headings and fences with no prose between them score as a diff dump', () => {
    const body = ['# A change', '', '## One', '', '```diff file=src/a.ts', '```', ''].join('\n');
    const { readability } = scoreWalkthrough(body, PATCH);

    expect(dimension(readability, 'prose-density').score).to.be.lessThan(0.5);
  });

  test('a changeset is not counted against coverage', () => {
    const noisy = [
      PATCH,
      'diff --git a/.changeset/wild-pans-argue.md b/.changeset/wild-pans-argue.md',
      '--- a/.changeset/wild-pans-argue.md',
      '+++ b/.changeset/wild-pans-argue.md',
      '@@ -0,0 +1,2 @@',
      '+Retry the first call.',
      '',
    ].join('\n');
    const { correctness } = scoreWalkthrough(GOOD, noisy);

    // `fillWalkthrough` appends it either way, so prose about it would only cost the reader.
    expect(dimension(correctness, 'hunk-coverage').score).to.eq(1);
    expect(dimension(correctness, 'hunk-coverage').evidence).to.deep.eq([]);
  });

  test('a fence on a lockfile is prose spent on machine output', () => {
    const patch = [
      PATCH,
      'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
      '--- a/pnpm-lock.yaml',
      '+++ b/pnpm-lock.yaml',
      '@@ -1,1 +1,2 @@',
      ' lockfileVersion: 9',
      '+  resolution: {}',
      '',
    ].join('\n');
    const body = GOOD + '\n## Dependencies\n\nThe lockfile moved with it.\n\n```diff file=pnpm-lock.yaml\n```\n';
    const { correctness } = scoreWalkthrough(body, patch);

    expect(dimension(correctness, 'generated-ignored').score).to.be.lessThan(1);
    expect(dimension(correctness, 'generated-ignored').evidence).to.deep.eq(['pnpm-lock.yaml']);
  });

  test('a walkthrough that leaves generated files alone scores full marks for it', () => {
    expect(dimension(scoreWalkthrough(GOOD, PATCH).correctness, 'generated-ignored').score).to.eq(1);
  });

  test('a hunk\u2019s line numbers do not ground a number in the prose', () => {
    const patch = PATCH.replace('@@ -10,3 +10,4 @@', '@@ -250,3 +250,4 @@');
    const body = GOOD.replace('lines=10-13', 'lines=250-253').replace(
      'The second attempt runs on a warmed socket.',
      'The second attempt waits 250 milliseconds.',
    );
    const { correctness } = scoreWalkthrough(body, patch);

    expect(dimension(correctness, 'numbers-grounded').evidence).to.deep.eq(['250']);
  });

  test('a binary the extension does not announce is still generated', () => {
    const patch = [
      PATCH,
      'diff --git a/fixtures/corpus b/fixtures/corpus',
      'Binary files a/fixtures/corpus and b/fixtures/corpus differ',
      '',
    ].join('\n');
    const body = GOOD + '\n## The corpus\n\nIt was regenerated.\n\n```diff file=fixtures/corpus\n```\n';
    const { correctness } = scoreWalkthrough(body, patch);

    expect(dimension(correctness, 'generated-ignored').evidence).to.deep.eq(['fixtures/corpus']);
  });

  test('a fenced block ends only at a closer with nothing after it', () => {
    // ```text opens a block; reading it as a closer would spill the diff into the prose metrics.
    const body = GOOD.replace('## The header', '```text\nnot prose, not a closer\n```\n\n## The header');
    expect(proseOf(body)).to.not.contain('not prose, not a closer');
    expect(proseOf(body)).to.contain('The header line moved out of the handler');
  });

  test('a heading naming a symbol is not title case', () => {
    const body = GOOD.replace('# Retry the first call', '# Retry added() before keep()');
    const { readability } = scoreWalkthrough(body, PATCH);

    expect(dimension(readability, 'sentence-case-headings').score).to.eq(1);
  });

  test('a filled body scores like the model output it was built from', () => {
    const { body: filled } = fillWalkthrough(GOOD, PATCH);
    const raw = scoreWalkthrough(GOOD, PATCH);
    const stored = scoreWalkthrough(filled, PATCH);

    // The stored walkthrough carries the patch's own lines in its fences and an appendix of
    // everything it did not claim; neither may change what it scores.
    expect(dimension(stored.correctness, 'fences-authentic').score).to.eq(1);
    expect(dimension(stored.correctness, 'hunk-coverage').score).to.eq(
      dimension(raw.correctness, 'hunk-coverage').score,
    );
  });

  test('prose metrics never read the diff itself', () => {
    expect(proseOf(GOOD)).to.not.contain('file=src/a.ts');
    expect(proseOf(GOOD)).to.contain('A cold socket rejects');
  });
});
