//
// Copyright 2026 DXOS.org
//

// Unit tests for the System One checker's pure parts and its two-round flow, with a fake client
// standing in for the API. Run: bun test ./.agents/skills/agentic-review

import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadRules } from '../mdl.ts';
import { estimateTokens, packQuestions, REQUEST_BUDGET, STATE_PLUS_QUESTION_BUDGET } from './budget.ts';
import { classify, followUpBatches, runReview, uncertainBounds } from './checker.ts';
import { parseImports } from './fetchers.ts';
import { contextQuestion, ruleText, verdictQuestion } from './questions.ts';
import { exportedNames, identifierWords, MAX_SEGMENTS, segmentLines, truncateText, windowLines } from './source.ts';

const ruleDoc = (body) => `---\nid: test\n---\n\n\`\`\`mdl\n${body}\n\`\`\`\n`;

const withRuleFile = (body, run) => {
  const dir = mkdtempSync(join(tmpdir(), 'rules-'));
  try {
    const path = join(dir, 'rules.mdl');
    writeFileSync(path, ruleDoc(body));
    return run(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe('rule fields', () => {
  test('parses unit, context, question and system-one, and keeps prose separate', () => {
    const [rule] = withRuleFile(
      [
        'rule sample: A sample rule',
        '  Flag: a thing. Do not flag: another thing.',
        '  files:',
        '    - packages/**/*.ts',
        '  unit: file',
        '  context: diff, siblings',
        '  question: Does the file do the thing?',
        '  system-one: off',
      ].join('\n'),
      loadRules,
    );
    assert.equal(rule.unit, 'file');
    assert.deepEqual(rule.context, ['diff', 'siblings']);
    assert.equal(rule.question, 'Does the file do the thing?');
    assert.equal(rule.systemOne, false);
    assert.equal(rule.instructions, 'Flag: a thing. Do not flag: another thing.');
  });

  test('defaults to a file unit with no context, checked by System One', () => {
    const [rule] = withRuleFile('rule plain: Plain\n  Prose.\n  files: packages/**/*.ts', loadRules);
    assert.equal(rule.unit, 'file');
    assert.deepEqual(rule.context, []);
    assert.equal(rule.systemOne, true);
  });

  test('rejects an unknown context kind and a file-only kind on a pr rule', () => {
    assert.throws(
      () => withRuleFile('rule bad: Bad\n  Prose.\n  files: a.ts\n  context: vibes', loadRules),
      /unknown context "vibes"/,
    );
    assert.throws(
      () => withRuleFile('rule bad: Bad\n  Prose.\n  files: a.ts\n  unit: pr\n  context: siblings', loadRules),
      /describes one file/,
    );
  });
});

describe('budget', () => {
  test('packs questions into batches under the request budget', () => {
    const question = { type: 'noul', instructions: 'x'.repeat(12_000) };
    const entries = Array.from({ length: 20 }, (_, index) => ({ id: `q${index}`, question }));
    const { batches, oversized } = packQuestions(1_000, entries);
    assert.equal(oversized.length, 0);
    assert.ok(batches.length > 1);
    for (const batch of batches) {
      const tokens =
        1_000 + batch.reduce((sum, entry) => sum + estimateTokens(entry.question) + estimateTokens(entry.id), 0);
      assert.ok(tokens <= REQUEST_BUDGET);
    }
    assert.equal(batches.flat().length, 20);
  });

  test('reports a question that cannot fit beside its state', () => {
    const question = { type: 'noul', instructions: 'x'.repeat(30_000) };
    const { batches, oversized } = packQuestions(STATE_PLUS_QUESTION_BUDGET - 100, [{ id: 'big', question }]);
    assert.deepEqual(oversized, ['big']);
    assert.equal(batches.length, 0);
  });
});

describe('source', () => {
  test('segments at top-level declarations and caps the option count', () => {
    const lines = [
      'import x from "y";',
      '',
      'export const a = 1;',
      'const b = 2;',
      '',
      '',
      'export function c() {',
      '  return 1;',
      '}',
      '',
    ];
    const segments = segmentLines(lines);
    assert.equal(segments[0].start, 1);
    assert.ok(segments.every((segment) => segment.end >= segment.start));
    const many = Array.from({ length: 2_000 }, (_, index) => `export const v${index} = ${index};`);
    assert.ok(segmentLines(many).length <= MAX_SEGMENTS);
  });

  test('windows cover every line with balanced sizes', () => {
    const lines = Array.from({ length: 1_000 }, (_, index) => `const line${index} = ${index};`);
    const windows = windowLines(lines, 10_000);
    assert.equal(windows[0].start, 1);
    const last = windows.at(-1);
    assert.equal(last.start + last.lines.length - 1, 1_000);
    const sizes = windows.map((window) => window.lines.length);
    assert.ok(Math.min(...sizes) > Math.max(...sizes) / 2);
  });

  test('extracts exported names and splits identifiers into words', () => {
    assert.deepEqual(exportedNames('export const makeIndex = 1;\nexport interface Foo {}\nconst hidden = 2;'), [
      'makeIndex',
      'Foo',
    ]);
    assert.deepEqual(identifierWords('makeSpaceIndexHTTPClient'), ['make', 'space', 'index', 'http', 'client']);
  });

  test('truncates at a line boundary and says how much was dropped', () => {
    const text = Array.from({ length: 50 }, (_, index) => `line ${index}`).join('\n');
    assert.match(truncateText(text, 100), /\[\d+ more lines not shown\]$/);
  });
});

describe('imports', () => {
  test('reads import and re-export clauses, not declarations that happen to precede a from', () => {
    const text = [
      "import * as Effect from 'effect/Effect';",
      "import { type A, b as c } from './b.ts';",
      'export const Dashboard = Capability.lazyModule(',
      "  'Dashboard',",
      "  () => import('./dashboard.ts'),",
      ');',
      "export { d } from './d.ts';",
    ].join('\n');
    assert.deepEqual(parseImports(text), [
      { specifier: 'effect/Effect', names: ['Effect'] },
      { specifier: './b.ts', names: ['A', 'c'] },
      { specifier: './d.ts', names: ['d'] },
    ]);
  });
});

describe('questions', () => {
  const rule = {
    id: 'r',
    title: 'R',
    unit: 'file',
    question: null,
    instructions: 'Flag x.\nSource: 3 comments, e.g.\nhttps://x',
  };

  test('drops the provenance line from the rule text', () => {
    assert.equal(ruleText(rule), 'Flag x.');
    assert.equal(verdictQuestion(rule).type, 'noul');
  });

  test('offers only the kinds a unit allows and has not got yet', () => {
    const asked = contextQuestion({ ...rule, unit: 'pr' }, ['diff']);
    assert.deepEqual(Object.keys(asked.criteria).sort(), ['none', 'package', 'pr', 'public-api']);
    assert.equal(contextQuestion({ ...rule, unit: 'pr' }, ['diff', 'package', 'public-api', 'pr']), null);
  });
});

describe('uncertain bounds', () => {
  const verdicts = (ruleId, scores) => scores.map((probability) => ({ rule: { id: ruleId }, probability }));
  const settings = { threshold: 0.8, uncertain: 0.15, lift: 0.15, minSample: 5 };

  test('raise a rule that scores middling everywhere above its own median', () => {
    const bounds = uncertainBounds(
      [...verdicts('vague', [0.3, 0.3, 0.35, 0.4, 0.3]), ...verdicts('sharp', [0.02, 0.05, 0.03, 0.9, 0.04])],
      settings,
    );
    assert.equal(bounds.get('vague'), 0.3 + 0.15);
    assert.equal(bounds.get('sharp'), 0.04 + 0.15);
    assert.equal(classify({ rule: { id: 'vague' }, probability: 0.4 }, settings, bounds), 'clean');
    assert.equal(classify({ rule: { id: 'vague' }, probability: 0.5 }, settings, bounds), 'uncertain');
  });

  test('fall back to the floor when a rule has too few verdicts', () => {
    const bounds = uncertainBounds(verdicts('rare', [0.4, 0.4]), settings);
    assert.equal(bounds.get('rare'), 0.15);
  });
});

describe('follow-ups', () => {
  test("regroup one rule's leftover files into batches pointed at one of its fragments", () => {
    const files = Array.from({ length: 7 }, (_, index) => `f${index}.ts`);
    const batches = followUpBatches(new Map([['r', { nn: '04', files }]]), 3);
    assert.deepEqual(
      batches.map((batch) => batch.files.length),
      [3, 3, 1],
    );
    assert.ok(batches.every((batch) => batch.nn === '04' && batch.ruleId === 'r'));
  });
});

describe('two rounds', () => {
  const file = '.agents/skills/agentic-review/lib/frontmatter.ts';
  const rule = {
    id: 'sample',
    title: 'Sample',
    unit: 'file',
    context: [],
    question: null,
    instructions: 'Flag x.',
    severity: 'warn',
  };
  const settings = { threshold: 0.8, uncertain: 0.15, need: 0.35, rounds: 2 };

  test('re-asks an uncertain verdict with the context its model asked for, then locates it', async () => {
    const calls = [];
    const client = {
      evaluate: async (state, questions) => {
        calls.push({ state, questions });
        const answers = {};
        for (const [id, question] of Object.entries(questions)) {
          if (question.type === 'noul') {
            answers[id] = { type: 'noul', noul: state.context?.siblings ? 0.9 : 0.5 };
          } else if (id.endsWith('_c')) {
            answers[id] = {
              type: 'choice',
              choice: 'siblings',
              confidence: 0.8,
              probabilities: { siblings: 0.8, none: 0.2 },
            };
          } else {
            answers[id] = { type: 'choice', choice: Object.keys(question.criteria)[1], confidence: 0.7 };
          }
        }
        return { answers, usage: { input_tokens: 100, output_tokens: 0 } };
      },
    };
    const { verdicts, stats } = await runReview({
      client,
      root: process.cwd(),
      base: null,
      fileTargets: [{ file, rules: [rule] }],
      prTargets: [],
      settings,
    });
    assert.equal(calls.length, 2);
    assert.equal(stats.contextRetries, 1);
    const [verdict] = verdicts;
    assert.equal(verdict.probability, 0.9);
    assert.equal(verdict.firstProbability, 0.5);
    assert.deepEqual(verdict.kinds, ['siblings']);
    assert.equal(classify(verdict, settings), 'violation');
    assert.ok(verdict.where.start > 1);
  });

  test("routes a failed request's pairs onward as unanswered, and stops on an account failure", async () => {
    const failing = {
      evaluate: async () => {
        throw new Error('System One answered 400: bad question');
      },
    };
    const { verdicts, stats } = await runReview({
      client: failing,
      root: process.cwd(),
      base: null,
      fileTargets: [{ file, rules: [rule] }],
      prTargets: [],
      settings,
    });
    assert.equal(stats.failedRequests, 1);
    assert.equal(classify(verdicts[0], settings), 'unanswered');
    const broke = {
      evaluate: async () => {
        throw Object.assign(new Error('System One answered 402: no credits'), { fatal: true });
      },
    };
    await assert.rejects(
      runReview({
        client: broke,
        root: process.cwd(),
        base: null,
        fileTargets: [{ file, rules: [rule] }],
        prTargets: [],
        settings,
      }),
      /402/,
    );
  });

  test('asks nothing more of a clean verdict', async () => {
    let calls = 0;
    const client = {
      evaluate: async (state, questions) => {
        calls++;
        return {
          answers: Object.fromEntries(
            Object.entries(questions).map(([id, question]) => [
              id,
              question.type === 'noul'
                ? { type: 'noul', noul: 0.05 }
                : { type: 'choice', choice: 'none', confidence: 0.9 },
            ]),
          ),
        };
      },
    };
    const { verdicts } = await runReview({
      client,
      root: process.cwd(),
      base: null,
      fileTargets: [{ file, rules: [rule] }],
      prTargets: [],
      settings,
    });
    assert.equal(calls, 1);
    assert.equal(classify(verdicts[0], settings), 'clean');
  });
});
