//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import DEUS_SPEC from '../../../../../reflect/deus/SPEC.mdl?raw';
import CANVAS_AUTOGROW_SPEC from './__fixtures__/canvas-autogrow.mdl?raw';
import INBOX_SYNC_SPEC from './__fixtures__/inbox-sync.mdl?raw';
import { type DecisionModel, SPEC_BLOCK_PREFIX, buildChangelogGraph, groupByDecider } from './decision-model.ts';

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
});
