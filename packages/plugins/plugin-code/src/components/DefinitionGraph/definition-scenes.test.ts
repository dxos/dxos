//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import CODE_SPEC from '../../../PLUGIN.mdl?raw';
import { DEFAULT_ROLES, buildDefinitionGraph, groupDefinitions } from '../SpecModel/index.ts';
import {
  SPEC_LEVEL,
  blockScene,
  clusterScene,
  compileBlock,
  definitionLevels,
  specScene,
} from './definition-scenes.ts';

describe('definitionLevels', () => {
  const graph = buildDefinitionGraph(CODE_SPEC);
  const grouping = groupDefinitions(graph, DEFAULT_ROLES);
  const byId = new Map(graph.definitions.map((definition) => [definition.id, definition]));
  const labels = { above: 'Named by', below: 'Names', checks: 'Checked by' };

  const options = {
    spec: { name: 'Spec', scene: specScene(grouping) },
    cluster: (id: string) => ({ name: id, scene: clusterScene(grouping, id, { buildsOn: 'builds on' }) }),
    block: (ref: string) => ({ name: ref, scene: blockScene(byId, grouping, graph.edges, ref, labels) }),
    opens: () => true,
  };

  test('a block opens its level once that level is laid out', ({ expect }) => {
    const first = definitionLevels(options);
    expect(first.pending.length).toBeGreaterThan(0);
    expect(Object.values(first.set.drills).flatMap((targets) => Object.values(targets))).not.toContainEqual(
      expect.stringMatching(/^block:/),
    );
    const [ref] = first.pending;
    const next = definitionLevels(options, new Map([...first.compiled, compileBlock(options, ref)]));
    expect(next.pending).not.toContain(ref);
    expect(Object.values(next.set.drills).flatMap((targets) => Object.values(targets))).toContain(`block:${ref}`);
  });

  test('the spec drills into its clusters, a cluster into its blocks, and a block no further', ({ expect }) => {
    const { compiled, pending } = definitionLevels(options);
    const { set, cards } = definitionLevels(
      options,
      new Map([...compiled, ...pending.map((ref) => compileBlock(options, ref))]),
    );
    const kinds = (targets: Record<string, string>) => new Set(Object.values(targets).map((id) => id.split(':')[0]));
    expect(set.root).toBe(SPEC_LEVEL);
    expect(kinds(set.drills[SPEC_LEVEL])).toEqual(new Set(['cluster']));
    for (const [level, targets] of Object.entries(set.drills)) {
      level.startsWith('cluster:') && expect(kinds(targets)).toEqual(new Set(['block']));
      level.startsWith('block:') && expect(targets).toEqual({});
    }
    expect(Object.keys(set.diagrams).every((level) => set.names[level] !== undefined)).toBe(true);
    expect([...cards.keys()].every((key) => key.split('#')[0] in set.diagrams)).toBe(true);
  });
});
