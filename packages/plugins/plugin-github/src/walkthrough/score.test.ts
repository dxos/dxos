//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

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

  test('a fence the model filled itself is counted as transcription, not coverage', () => {
    const body = GOOD.replace('```diff file=src/a.ts lines=10-13\n```', '```diff file=src/a.ts\n+is();\n```');
    const { correctness } = scoreWalkthrough(body, PATCH);

    expect(dimension(correctness, 'fences-empty').score).to.eq(0.5);
    expect(dimension(correctness, 'hunk-coverage').score).to.eq(0.5);
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

  test('prose metrics never read the diff itself', () => {
    expect(proseOf(GOOD)).to.not.contain('file=src/a.ts');
    expect(proseOf(GOOD)).to.contain('A cold socket rejects');
  });
});
