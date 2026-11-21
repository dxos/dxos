//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { parseSession } from './session.ts';
import { SAMPLE_SESSION } from './testing/sample.ts';

const messages = (text: string, previous?: string) =>
  parseSession(text, previous === undefined ? {} : { previous: [previous] }).errors.map(
    ({ line, message }) => `${line}: ${message}`,
  );

/** The sample with one block's text replaced, to break one rule at a time. */
const edit = (from: string, to: string) => {
  expect(SAMPLE_SESSION).toContain(from);
  return SAMPLE_SESSION.replace(from, to);
};

/** The sample with decisions appended to its `## Changelog`, each written as its header line and then its fields. */
const withDecision = (...lines: string[]) => {
  const blocks = lines
    .join('\n')
    .split(/\n(?=decision )/)
    .map((block) => {
      const [header, ...fields] = block.split('\n');
      return ['```mdl', header, '  date: 2026-11-21', '  by: user:alice', ...fields, '```'].join('\n');
    });
  return SAMPLE_SESSION.replace('\n## Timeline', `\n${blocks.join('\n\n')}\n\n## Timeline`);
};

describe('parseSession', () => {
  test('parses the sample', ({ expect }) => {
    const { board, errors } = parseSession(SAMPLE_SESSION, { updated: '2026-11-21T12:00:00.000Z' });
    expect(errors).toEqual([]);
    expect(board?.title).toBe('Session board skill');
    expect(board?.questions.map(({ id, answer }) => [id, answer])).toEqual([
      ['Q-1', undefined],
      ['Q-2', 'Yes. Session files are committed with the work.'],
    ]);
    expect(board?.questions[0].options[0]).toEqual({
      title: 'Yes',
      description: 'the page reads the state through the GitHub connector.',
    });
    expect(board?.goals.map(({ id, status, blocked }) => [id, status, blocked])).toEqual([
      ['G-1', 'done', false],
      ['G-2', 'started', true],
      ['G-3', 'review', false],
      ['G-4', 'cancelled', false],
    ]);
    expect(board?.prs[0]).toMatchObject({
      ref: 'dxos/dxos#14647',
      url: 'https://github.com/dxos/dxos/pull/14647',
      status: 'landing',
      branch: 'claude/status-board',
    });
    expect(board?.timeline.map(({ id }) => id)).toEqual(['T-1', 'T-2']);
  });

  test('an answer unblocks a goal', ({ expect }) => {
    const answered = edit('  answers: Q-2', '  answers: Q-1');
    expect(parseSession(answered).board?.goals[1].blocked).toBe(false);
  });

  test('a decision that supersedes the active answer replaces it', ({ expect }) => {
    const superseded = withDecision('decision D-2: No. Use `.agents/sessions/`.', '  supersedes: D-1');
    expect(parseSession(superseded).board?.questions[1].answer).toBe('No. Use `.agents/sessions/`.');
    // D-3 supersedes D-1, which is no longer the answer, so D-2 stays.
    const stale = withDecision(
      'decision D-2: No. Use `.agents/sessions/`.',
      '  supersedes: D-1',
      'decision D-3: Maybe.',
      '  supersedes: D-1',
    );
    expect(parseSession(stale).board?.questions[1].answer).toBe('No. Use `.agents/sessions/`.');
  });

  test('rejects decisions that cannot stand', () => {
    expect(messages(withDecision('decision D-2: Yes.', '  supersedes: D-9'))).toEqual([
      expect.stringMatching(/D-2 supersedes D-9, which is not an earlier decision/),
    ]);
    expect(messages(withDecision('decision D-2: Yes.', '  answers: Q-1', '  supersedes: D-1'))).toEqual([
      expect.stringMatching(/D-2 answers Q-1 but supersedes D-1, which answered Q-2/),
    ]);
    expect(messages(withDecision('decision D-2:', '  answers: Q-1'))).toEqual([
      expect.stringMatching(/D-2 answers Q-1 but says nothing/),
    ]);
    // An empty answer must not unblock G-2.
    expect(parseSession(withDecision('decision D-2:', '  answers: Q-1')).board).toBeUndefined();
  });

  test('keeps each block in its section', () => {
    const misplaced = `${SAMPLE_SESSION}\n\`\`\`mdl\ndecision D-2: No.\n  date: 2026-11-21\n  by: user:alice\n  supersedes: D-1\n\`\`\`\n`;
    expect(messages(misplaced)).toEqual([expect.stringMatching(/D-2 belongs under `## Changelog`, not `## Timeline`/)]);
  });

  test('rejects unknown states and dangling references', () => {
    expect(messages(edit('  status: review', '  status: later'))).toEqual([
      expect.stringMatching(/G-3: status must be one of todo, backlog/),
    ]);
    expect(messages(edit('  blockedBy: [Q-1]', '  blockedBy: [Q-9]'))).toEqual([
      '1: G-2 is blocked by Q-9, which is not a question in this file',
    ]);
    expect(messages(edit('  ref: dxos/dxos#10391', '  ref: 10391'))).toEqual([
      expect.stringMatching(/PR-2: ref must be owner\/repo#number/),
    ]);
  });

  test('enforces the word budget', () => {
    const long = Array.from({ length: 13 }, () => 'word').join(' ');
    expect(messages(edit('goal G-3: The timeline is append-only.', `goal G-3: ${long}.`))).toEqual([
      expect.stringMatching(/G-3: 13 words; the limit is 12/),
    ]);
  });

  test('keeps the timeline in order', () => {
    expect(messages(edit('  date: 2026-11-21T11:55Z', '  date: 2026-11-21T11:00Z'))).toEqual([
      expect.stringMatching(/T-2 is dated before T-1/),
    ]);
    expect(messages(edit('  date: 2026-11-21T11:55Z', '  date: today'))).toEqual([
      expect.stringMatching(/T-2: date must be an ISO 8601/),
    ]);
    expect(messages(edit('  date: 2026-11-21T11:55Z', '  date: 2026-13-01T12:00Z'))).toEqual([
      expect.stringMatching(/T-2: date must be an ISO 8601/),
    ]);
    // Seconds are later than the same minute, not earlier as their text sorts.
    expect(messages(edit('  date: 2026-11-21T11:30Z', '  date: 2026-11-21T11:30:30Z'))).toEqual([]);
    expect(messages(edit('  date: 2026-11-21T11:55Z', '  date: 2026-11-21T11:30Z'))).toEqual([]);
  });

  test('keeps questions, answers and the timeline append-only', () => {
    expect(messages(SAMPLE_SESSION, SAMPLE_SESSION)).toEqual([]);
    expect(messages(edit('event T-1: The session started.', 'event T-1: The session began.'), SAMPLE_SESSION)).toEqual([
      '1: event T-1 was edited, removed or moved; questions, answers and the timeline only grow at the end',
    ]);
    const withoutQuestion = edit('question Q-1: Must the script', 'question Q-1: Can the script');
    expect(messages(withoutQuestion, SAMPLE_SESSION)).toEqual([
      '1: question Q-1 was edited, removed or moved; questions, answers and the timeline only grow at the end',
    ]);
    const second = withDecision('decision D-2: No.', '  answers: Q-1');
    const swapped = second.replace(
      /(```mdl\ndecision D-1[\s\S]*?```)(\n\n)(```mdl\ndecision D-2[\s\S]*?```)/,
      '$3$2$1',
    );
    expect(messages(swapped, second)).toEqual([expect.stringMatching(/decision D-1 was edited, removed or moved/)]);
    const appended = `${SAMPLE_SESSION}\n\`\`\`mdl\nevent T-3: Merged.\n  date: 2026-11-21T12:30Z\n\`\`\`\n`;
    expect(messages(appended, SAMPLE_SESSION)).toEqual([]);
  });

  test('reports a block type the file does not declare', () => {
    const undeclared = edit('| `pr`       | `org.dxos.mdl.pr@1.0`       |\n', '');
    expect(messages(undeclared)).toEqual([
      expect.stringMatching(/Unknown block type "pr"/),
      expect.stringMatching(/Unknown block type "pr"/),
    ]);
  });
});
