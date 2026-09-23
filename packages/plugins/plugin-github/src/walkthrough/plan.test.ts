//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { parsePatch } from './patch.ts';
import { assembleWalkthrough, buildChapterPrompt, buildPlannerPrompt, chapterDiff, parsePlan } from './plan.ts';

const PATCH = [file('src/core.ts', 3), file('src/caller.ts', 2), file('pnpm-lock.yaml', 400)].join('\n');
const FACTS = { owner: 'dxos', repo: 'dxos', number: 13288, title: 'A large change' };
const PATHS = ['src/core.ts', 'src/caller.ts'];

describe('buildPlannerPrompt', () => {
  test('lists files and sizes, never their contents', () => {
    const prompt = buildPlannerPrompt(FACTS, PATCH);

    expect(prompt).to.contain('src/core.ts (+3/-0, 1 hunks)');
    expect(prompt).to.not.contain('+line 0;');
  });

  test('leaves generated files out of the plan entirely', () => {
    expect(buildPlannerPrompt(FACTS, PATCH)).to.not.contain('pnpm-lock.yaml');
    expect(buildPlannerPrompt(FACTS, PATCH)).to.contain('Files changed (2)');
  });
});

describe('parsePlan', () => {
  const RESPONSE = JSON.stringify({
    title: 'Evaluate queries in SQLite',
    overview: 'A second executor, off by default.',
    chapters: [
      { title: 'The compiler', summary: 'Why a CTE per step.', files: ['src/core.ts'] },
      { title: 'The call sites', files: ['src/caller.ts'] },
    ],
  });

  test('reads a plan, fenced or bare', () => {
    const plan = parsePlan(RESPONSE, PATHS);
    expect(plan?.title).to.eq('Evaluate queries in SQLite');
    expect(plan?.chapters.map((chapter) => chapter.title)).to.deep.eq(['The compiler', 'The call sites']);
    expect(parsePlan('Here you go:\n```json\n' + RESPONSE + '\n```\n', PATHS)?.chapters).to.have.length(2);
  });

  test('drops a file the patch does not contain', () => {
    const invented = JSON.stringify({
      title: 'A change',
      chapters: [{ title: 'One', files: ['src/core.ts', 'src/invented.ts'] }],
    });
    expect(parsePlan(invented, PATHS)?.chapters[0].files).to.deep.eq(['src/core.ts']);
  });

  test('gives a file to the first chapter that claims it', () => {
    const duplicated = JSON.stringify({
      title: 'A change',
      chapters: [
        { title: 'One', files: ['src/core.ts'] },
        { title: 'Two', files: ['src/core.ts', 'src/caller.ts'] },
      ],
    });
    const plan = parsePlan(duplicated, PATHS);
    expect(plan?.chapters[0].files).to.deep.eq(['src/core.ts']);
    expect(plan?.chapters[1].files).to.deep.eq(['src/caller.ts']);
  });

  test('sweeps up files the planner forgot, so the reader still meets them', () => {
    const partial = JSON.stringify({ title: 'A change', chapters: [{ title: 'One', files: ['src/core.ts'] }] });
    const plan = parsePlan(partial, PATHS);

    expect(plan?.chapters).to.have.length(2);
    expect(plan?.chapters[1]).to.deep.contain({ title: 'The rest of the change' });
    expect(plan?.chapters[1].files).to.deep.eq(['src/caller.ts']);
  });

  test('drops a summary that is not a string, rather than carrying it into the next prompt', () => {
    const malformed = JSON.stringify({
      title: 'A change',
      overview: { not: 'a string' },
      chapters: [{ title: 'One', summary: { also: 'not a string' }, files: ['src/core.ts', 42] }],
    });
    const plan = parsePlan(malformed, PATHS);

    expect(plan?.overview).to.eq('');
    expect(plan?.chapters[0].summary).to.be.undefined;
    expect(plan?.chapters[0].files).to.deep.eq(['src/core.ts']);
    expect(buildChapterPrompt(plan!, plan!.chapters[0], 'diff')).to.not.contain('[object Object]');
  });

  test('reads a fenced plan whose JSON contains a fence-like sequence', () => {
    const response = [
      'Here is the plan:',
      '```json',
      JSON.stringify({
        title: 'A change',
        overview: 'Chapters are written as ```text blocks elsewhere.',
        chapters: [{ title: 'One', files: ['src/core.ts'] }],
      }),
      '```',
    ].join('\n');

    expect(parsePlan(response, PATHS)?.chapters[0].title).to.eq('One');
  });

  test('refuses an unreadable answer rather than inventing a plan', () => {
    expect(parsePlan('I cannot help with that.', PATHS)).to.be.undefined;
    expect(parsePlan('{"title": "A change"}', PATHS)).to.be.undefined;
    expect(parsePlan(JSON.stringify({ title: 'A', chapters: [{ title: 'B', files: ['gone.ts'] }] }), PATHS)).to.be
      .undefined;
  });
});

describe('chapterDiff', () => {
  test('carries only the chapter’s own files', () => {
    const files = parsePatch(PATCH);
    const diff = chapterDiff(files, { title: 'The compiler', files: ['src/core.ts'] });

    expect(diff).to.contain('src/core.ts');
    expect(diff).to.not.contain('src/caller.ts');
  });
});

describe('buildChapterPrompt', () => {
  test('names the heading to write and the other chapters as context', () => {
    const plan = parsePlan(
      JSON.stringify({
        title: 'A change',
        overview: 'Why.',
        chapters: [
          { title: 'One', summary: 'Explain the core.', files: ['src/core.ts'] },
          { title: 'Two', files: ['src/caller.ts'] },
        ],
      }),
      PATHS,
    )!;
    const prompt = buildChapterPrompt(plan, plan.chapters[0], 'diff goes here');

    expect(prompt).to.contain('Your chapter: ## One');
    expect(prompt).to.contain('What it must explain: Explain the core.');
    expect(prompt).to.contain('Other chapters, for context only: Two');
    expect(prompt).to.contain('diff goes here');
  });
});

describe('assembleWalkthrough', () => {
  test('puts one H1 over the chapters the writers produced', () => {
    const body = assembleWalkthrough({ title: 'A change', overview: 'Why it exists.', chapters: [] }, [
      '## One\n\nFirst.\n',
      '## Two\n\nSecond.\n',
    ]);

    expect(body.match(/^# /gm)).to.have.length(1);
    expect(body).to.contain('# A change');
    expect(body).to.contain('Why it exists.');
    expect(body.indexOf('## One')).to.be.lessThan(body.indexOf('## Two'));
    expect(body).to.not.contain('\n\n\n');
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
