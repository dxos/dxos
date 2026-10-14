//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { SYSTEM_PROMPT, buildPrompt, promptOmissions } from './prompt.ts';

const INPUT = {
  owner: 'dxos',
  repo: 'dxos',
  number: 13082,
  title: 'A change',
  description: 'Why it exists.',
  baseBranch: 'main',
  headBranch: 'feature',
  diff: [file('src/small.ts', 2), file('src/large.ts', 400)].join('\n'),
};

describe('buildPrompt', () => {
  test('states the change and appends the diff', () => {
    const prompt = buildPrompt(INPUT);

    expect(prompt).to.contain('Repository: dxos/dxos');
    expect(prompt).to.contain('Pull request: #13082');
    expect(prompt).to.contain('Title: A change');
    expect(prompt).to.contain('Branch: feature into main');
    expect(prompt).to.contain('Why it exists.');
    expect(prompt).to.contain('diff --git a/src/small.ts');
  });

  test('omits the branch line when the pull request does not say', () => {
    const { baseBranch, headBranch, ...rest } = INPUT;
    expect(buildPrompt(rest)).to.not.contain('Branch:');
  });

  test('drops whole files to fit the budget, largest first', () => {
    const prompt = buildPrompt(INPUT, { maxDiffChars: 200 });

    expect(prompt).to.contain('src/small.ts');
    expect(prompt).to.not.contain('+line 399;');
    expect(prompt).to.contain('Omitted from the diff below for length');
    expect(prompt).to.contain('src/large.ts');
  });

  test('drops a generated file even when everything fits', () => {
    const withLock = {
      ...INPUT,
      diff: [INPUT.diff, file('pnpm-lock.yaml', 3), file('assets/logo.png', 1)].join('\n'),
    };
    const prompt = buildPrompt(withLock);

    // A lockfile is the largest hunk in most pull requests and the one nobody reads, so it never
    // competes with code for the budget.
    expect(prompt).to.not.contain('diff --git a/pnpm-lock.yaml');
    expect(prompt).to.contain('src/small.ts');
    expect(prompt).to.contain('not yours to describe: pnpm-lock.yaml, assets/logo.png');
    expect(promptOmissions(withLock)).to.deep.eq(['pnpm-lock.yaml', 'assets/logo.png']);
  });

  test('reports what the budget dropped', () => {
    expect(promptOmissions(INPUT, { maxDiffChars: 200 })).to.deep.eq(['src/large.ts']);
    expect(promptOmissions(INPUT)).to.deep.eq([]);
  });

  test('leaves a diff within budget untouched', () => {
    const prompt = buildPrompt(INPUT);
    expect(prompt).to.contain('+line 399;');
    expect(prompt).to.not.contain('Omitted from the diff');
  });
});

describe('SYSTEM_PROMPT', () => {
  test('tells the model the fence is empty and filled for it', () => {
    // The whole design rests on this instruction; a model that transcribes the diff produces an
    // artefact that misquotes the change.
    expect(SYSTEM_PROMPT).to.contain('```diff file=path/to/file.ts lines=66-99');
    expect(SYSTEM_PROMPT).to.contain('NEVER put diff content');
    expect(SYSTEM_PROMPT).to.contain('file AFTER the change');
  });

  test('asks for prose a reviewer can read once', () => {
    // Review time is what the walkthrough exists to save; see `.agents/skills/readable-prose`.
    expect(SYSTEM_PROMPT).to.contain('One idea per sentence');
    expect(SYSTEM_PROMPT).to.contain('Name the mechanism, not the feeling');
    expect(SYSTEM_PROMPT).to.contain('Sentence case headings');
  });
});

// A declaration rather than an arrow: the fixture above calls it at module evaluation.
function file(path: string, lines: number): string {
  return [
    `diff --git a/${path} b/${path}`,
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -1,1 +1,${lines + 1} @@`,
    ' keep();',
    ...Array.from({ length: lines }, (_, index) => `+line ${index};`),
  ].join('\n');
}
