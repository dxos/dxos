//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { checkChangelogChange } from '@dxos/deus/extension';

import DEUS_SPEC from '../../../../../reflect/deus/SPEC.mdl?raw';
import CANVAS_AUTOGROW_SPEC from './__fixtures__/canvas-autogrow.mdl?raw';
import INBOX_SYNC_SPEC from './__fixtures__/inbox-sync.mdl?raw';
import {
  type DecisionModel,
  SPEC_BLOCK_PREFIX,
  answerQuestion,
  buildChangelogGraph,
  buildQuestions,
  groupByDecider,
} from './decision-model.ts';

const decisionsOf = (content: string) =>
  new Map(
    buildChangelogGraph(content)
      .nodes.filter((node): node is DecisionModel => node.kind === 'decision')
      .map((node) => [node.id, node]),
  );

describe('changelog graph', () => {
  test('attributes each decision to a person or an agent', ({ expect }) => {
    const decisions = decisionsOf(DEUS_SPEC);
    expect(decisions.size).toBe(DEUS_SPEC.match(/^decision D-/gm)?.length);
    expect(decisions.get('D-1')).toMatchObject({ actor: 'user', handle: 'dmaretskyi', principal: undefined });
    expect(decisions.get('D-3')).toMatchObject({ actor: 'agent', handle: 'claude-code', principal: 'dmaretskyi' });
  });

  test('marks superseded decisions and draws an edge from the replacement', ({ expect }) => {
    const { edges } = buildChangelogGraph(DEUS_SPEC);
    expect(decisionsOf(DEUS_SPEC).get('D-7')?.supersededBy).toBe('D-10');
    expect(edges).toContainEqual(expect.objectContaining({ kind: 'supersedes', from: 'D-7', to: 'D-10' }));
    expect(edges).toContainEqual(expect.objectContaining({ kind: 'builds-on', from: 'D-1', to: 'D-3' }));
  });

  test('reads approvals from the prose of user decisions', ({ expect }) => {
    const { edges } = buildChangelogGraph(CANVAS_AUTOGROW_SPEC);
    const approvals = edges.filter(({ kind }) => kind === 'approves').map(({ from, to }) => `${to}>${from}`);
    expect(approvals).toEqual(['D-7>D-2', 'D-7>D-5', 'D-7>D-6', 'D-11>D-10']);
    expect(decisionsOf(CANVAS_AUTOGROW_SPEC).get('D-2')?.approvedBy).toEqual(['D-7']);
  });

  test('follows a supersede chain', ({ expect }) => {
    const decisions = decisionsOf(INBOX_SYNC_SPEC);
    expect(['D-1', 'D-3', 'D-5'].map((id) => decisions.get(id)?.supersededBy)).toEqual(['D-3', 'D-5', undefined]);
  });

  test('adds spec blocks only when asked', ({ expect }) => {
    expect(buildChangelogGraph(DEUS_SPEC).nodes.some((node) => node.kind === 'block')).toBe(false);
    const { nodes, edges } = buildChangelogGraph(DEUS_SPEC, { affects: true });
    expect(nodes).toContainEqual({ kind: 'block', id: `${SPEC_BLOCK_PREFIX}F-4.3`, label: 'F-4.3' });
    expect(edges).toContainEqual(
      expect.objectContaining({ kind: 'affects', from: 'D-17', to: `${SPEC_BLOCK_PREFIX}F-4.3` }),
    );
  });

  test('groups decisions by decider, people first and agents last', ({ expect }) => {
    const groups = groupByDecider([...decisionsOf(CANVAS_AUTOGROW_SPEC).values()]);
    const actors = groups.map(({ actor }) => actor);
    expect(actors.indexOf('agent')).toBeGreaterThan(actors.lastIndexOf('user'));
    expect(groups.reduce((total, { decisions }) => total + decisions.length, 0)).toBe(
      decisionsOf(CANVAS_AUTOGROW_SPEC).size,
    );
  });

  test('pairs each question with the decision that answers it, open ones first', ({ expect }) => {
    const questions = buildQuestions(CANVAS_AUTOGROW_SPEC);
    expect(questions.map(({ id, answer }) => [id, answer?.id])).toEqual([
      ['Q-2', undefined],
      ['Q-1', 'D-12'],
    ]);
    expect(questions[1].entry.options.map(({ title }) => title)).toEqual(['Never', 'On drop']);
    expect(buildChangelogGraph(CANVAS_AUTOGROW_SPEC).edges).toContainEqual(
      expect.objectContaining({ kind: 'answers', from: 'Q-1', to: 'D-12' }),
    );
  });
});

describe('answer question', () => {
  const props = { question: 'Q-1', answer: 'Never,\n ever.', by: 'user:alice', date: '2026-10-09' };
  const apply = (text: string) => {
    const edit = answerQuestion(text, props);
    return edit && text.slice(0, edit.from) + edit.insert + text.slice(edit.to);
  };

  test('appends the next decision at the end of the changelog', ({ expect }) => {
    const text = '# Spec\n\n## Changelog\n\n```mdl\ndecision D-4: X.\n  by: user:bob\n```\n\n\n## Appendix\n\nA.\n';
    expect(apply(text)).toBe(
      '# Spec\n\n## Changelog\n\n```mdl\ndecision D-4: X.\n  by: user:bob\n```\n\n' +
        '```mdl\ndecision D-5: Never, ever.\n  date: 2026-10-09\n  by: user:alice\n  answers: Q-1\n```\n\n## Appendix\n\nA.\n',
    );
  });

  test('records an answer the changelog check accepts', ({ expect }) => {
    const text = [
      '# Spec',
      '',
      '## Changelog',
      '',
      '```mdl\ndecision D-1: X.\n  date: 2026-10-08\n  by: user:bob\n```',
      '',
      '```mdl\nquestion Q-1: X or Y?\n  date: 2026-10-08\n  by: agent:claude-code\n  for: user:bob\n```',
      '',
    ].join('\n');
    const answered = apply(text);
    expect(answered).toBeDefined();
    expect(checkChangelogChange(text, answered ?? '')).toEqual([]);
    expect(buildQuestions(answered ?? '')[0].answer?.id).toBe('D-2');
  });

  test('needs a changelog', ({ expect }) => {
    expect(answerQuestion('# Spec\n', props)).toBeUndefined();
  });
});
