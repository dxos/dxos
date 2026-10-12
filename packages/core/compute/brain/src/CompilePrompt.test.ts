//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import * as Builtins from './Builtins.ts';
import * as CompilePrompt from './CompilePrompt.ts';
import * as Compiler from './Compiler.ts';
import * as Encoding from './Encoding.ts';
import { REFERENCE, SCENARIOS } from './testing/index.ts';
import * as Vocabulary from './Vocabulary.ts';

describe('CompilePrompt', () => {
  test('mentions every relation, built-in, head and canonical predicate', ({ expect }) => {
    const prompt = CompilePrompt.SYSTEM_PROMPT;
    const names = [
      ...Object.keys(Encoding.RELATIONS),
      ...Builtins.make(Builtins.emptyContext()).keys(),
      ...Compiler.GOAL_HEADS,
      ...Vocabulary.DEFAULT_ENTRIES.map(({ predicate }) => predicate),
    ];
    for (const name of names) {
      expect(prompt, name).toMatch(new RegExp(`\\b${name}\\(|^- ${name}\\b`, 'm'));
    }
  });

  test('documents exactly the registered built-ins', ({ expect }) => {
    expect(Object.keys(CompilePrompt.BUILTIN_DOCS).sort()).toEqual(
      [...Builtins.make(Builtins.emptyContext()).keys()].sort(),
    );
  });

  test('builds the canonical list from the given vocabulary', ({ expect }) => {
    const vocabulary = Vocabulary.make([{ predicate: 'reviews', synonyms: ['reviewing'] }]);
    expect(CompilePrompt.systemPrompt({ vocabulary })).toContain('- reviews (extracted as: reviewing)');
  });

  test('worked examples compile', ({ expect }) => {
    for (const example of CompilePrompt.EXAMPLES) {
      expect(Compiler.compile(example.datalog).diagnostics, example.goal).toEqual([]);
    }
  });

  test('user message carries the goal, owner, time, session and instructions', ({ expect }) => {
    const scenario = SCENARIOS.find(({ n }) => n === 3);
    expect(
      CompilePrompt.userMessage({
        goal: 'Get Dima to help me with the agent plugin',
        owner: 'rich',
        now: '2027-01-04T09:00:00Z',
        instructions: scenario?.context,
        session: 'session:s42',
      }),
    ).toBe(
      [
        'Goal: "Get Dima to help me with the agent plugin"',
        'Owner: rich',
        'Created: 2027-01-04T09:00:00Z',
        'Session goal; current session id: session:s42',
        'Instructions: Follow up after 2 days without a commitment.',
      ].join('\n'),
    );
    expect(CompilePrompt.userMessage({ goal: 'Learn French', owner: 'rich', now: 'now', instructions: ' ' })).toBe(
      'Goal: "Learn French"\nOwner: rich\nCreated: now',
    );
  });
});

describe('parseReply', () => {
  test('extracts every section', ({ expect }) => {
    const reply = CompilePrompt.parseReply(trim`
      <kind>outcome</kind>
      <drivers>fact, time</drivers>
      <achievement>rule</achievement>
      <datalog>
      ${REFERENCE[3]}
      </datalog>
      <notes>Refusals wake but never achieve.</notes>
    `);
    expect(reply).toEqual({
      kind: 'outcome',
      drivers: ['fact', 'time'],
      achievement: 'rule',
      datalog: REFERENCE[3],
      notes: 'Refusals wake but never achieve.',
    });
    expect(Compiler.compile(reply.datalog).diagnostics).toEqual([]);
  });

  test('accepts a code fence inside or instead of the datalog section', ({ expect }) => {
    const rules = 'wake(practice) :- every(1d), not achieved(goal).';
    expect(CompilePrompt.parseReply(`<datalog>\n\`\`\`prolog\n${rules}\n\`\`\`\n</datalog>`).datalog).toBe(rules);
    expect(CompilePrompt.parseReply(`Here you go:\n\`\`\`datalog\n${rules}\n\`\`\``)).toEqual({
      drivers: [],
      datalog: rules,
    });
  });

  test('fails with a typed error on a malformed reply', ({ expect }) => {
    const code = (text: string) => {
      try {
        CompilePrompt.parseReply(text);
        return undefined;
      } catch (error) {
        return error instanceof CompilePrompt.ReplyError ? error.code : error;
      }
    };
    expect(code('<kind>outcome</kind>')).toBe('missing-datalog');
    expect(code('<datalog>\n  \n</datalog>')).toBe('empty-datalog');
    expect(code('<kind>goal</kind><datalog>p(a).</datalog>')).toBe('invalid-kind');
    expect(code('<drivers>fact, email</drivers><datalog>p(a).</datalog>')).toBe('invalid-drivers');
    expect(code('<achievement>maybe</achievement><datalog>p(a).</datalog>')).toBe('invalid-achievement');
  });
});
