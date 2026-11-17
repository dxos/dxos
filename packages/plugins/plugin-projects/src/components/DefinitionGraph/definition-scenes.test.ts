//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import CODE_SPEC from '../../../../plugin-code/PLUGIN.mdl?raw';
import { buildDefinitionGraph, groupDefinitions, specDeclarations } from '../SpecModel/index.ts';
import {
  SPEC_LEVEL,
  blockScene,
  clusterScene,
  compileBlock,
  definitionLevels,
  specScene,
} from './definition-scenes.ts';

describe('definitionLevels', () => {
  const graph = buildDefinitionGraph(CODE_SPEC, {
    declarations: specDeclarations(CODE_SPEC, ['org.dxos.spec.software']),
  });
  const grouping = groupDefinitions(graph);
  const byId = new Map(graph.definitions.map((definition) => [definition.id, definition]));
  const labels = { above: 'Named by', below: 'Names', checks: 'Checked by' };

  const options = {
    spec: { name: 'Spec', scene: specScene(grouping) },
    cluster: (id: string) => ({ name: id, scene: clusterScene(grouping, graph.edges, id, { buildsOn: 'builds on' }) }),
    block: (ref: string) => ({ name: ref, scene: blockScene(byId, graph.edges, ref, labels) }),
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
    }
    const blockLevels = Object.keys(set.diagrams).filter((level) => level.startsWith('block:'));
    expect(blockLevels.length).toBeGreaterThan(0);
    expect(blockLevels.filter((level) => Object.keys(set.drills[level] ?? {}).length > 0)).toEqual([]);
    expect(Object.keys(set.diagrams).every((level) => set.names[level] !== undefined)).toBe(true);
    expect([...cards.keys()].every((key) => key.split('#')[0] in set.diagrams)).toBe(true);
  });

  test("a card outside a cluster drills nowhere, though its block's level is laid out", ({ expect }) => {
    const { compiled, pending } = definitionLevels(options);
    const { set, compiled: all } = definitionLevels(
      options,
      new Map([...compiled, ...pending.map((ref) => compileBlock(options, ref))]),
    );
    const outside = [...all].flatMap(([level, { cards }]) =>
      level.startsWith('cluster:')
        ? [...cards].flatMap(([id, card]) => (card.kind === 'definition' && card.outside ? [{ level, id, card }] : []))
        : [],
    );
    expect(outside.length).toBeGreaterThan(0);
    expect(outside.filter(({ card }) => all.has(`block:${card.ref}`)).length).toBeGreaterThan(0);
    expect(outside.filter(({ level, id }) => set.drills[level]?.[id] !== undefined)).toEqual([]);
  });

  test('keeps a laid-out level while its scene is unchanged, and lays it out again when it changes', ({ expect }) => {
    const { compiled, pending } = definitionLevels(options);
    const laidOut = new Map([...compiled, ...pending.map((ref) => compileBlock(options, ref))]);
    // The same scenes, built again as a text edit rebuilds them.
    const rebuilt = { ...options, spec: { name: 'Spec', scene: specScene(grouping) } };
    const again = definitionLevels(rebuilt, laidOut);
    expect(again.pending).toEqual([]);
    expect(again.compiled.get(SPEC_LEVEL)).toBe(laidOut.get(SPEC_LEVEL));

    const [ref] = pending;
    const changed = {
      ...rebuilt,
      block: (id: string) =>
        id === ref ? { name: id, scene: { nodes: [], edges: [], frames: [] } } : options.block(id),
    };
    const next = definitionLevels(changed, laidOut);
    expect(next.pending).toEqual([ref]);
    // The old layout stays drawn and reachable until the new one replaces it.
    expect(next.set.diagrams[`block:${ref}`]).toBe(laidOut.get(`block:${ref}`)!.commands);
    expect(Object.values(next.set.drills).some((drills) => Object.values(drills).includes(`block:${ref}`))).toBe(true);

    // A block that no longer opens a level keeps the one already drawn.
    const closed = definitionLevels({ ...rebuilt, opens: () => false }, laidOut);
    expect(closed.set.diagrams[`block:${ref}`]).toBe(laidOut.get(`block:${ref}`)!.commands);
    expect(Object.values(closed.set.drills).some((drills) => Object.values(drills).includes(`block:${ref}`))).toBe(
      true,
    );
  });
});

describe('clusterScene', () => {
  test('draws a context block several groups name once, in its own cluster', ({ expect }) => {
    const block = (...lines: string[]) => ['```mdl', ...lines, '```'];
    const text = [
      ...block('ext dep', '  uri: org.dxos.mdl.dep@1.0', '  desc: A library.', '  role: context'),
      ...block('dep Lib'),
      ...block('type X'),
      ...block('type Y'),
      ...block('feat F-1: One', '  uses: [X, Lib]'),
      ...block('feat F-2: Two', '  uses: [X, Lib]'),
      ...block('feat F-3: Three', '  uses: [Y, Lib]'),
      ...block('feat F-4: Four', '  uses: [Y]'),
    ].join('\n');
    const graph = buildDefinitionGraph(text, { declarations: specDeclarations(text, ['org.dxos.spec.software']) });
    const grouping = groupDefinitions(graph);
    const scene = (cluster: string) => clusterScene(grouping, graph.edges, cluster, { buildsOn: 'builds on' });
    expect(scene('cluster:Y').nodes.map(({ id }) => id)).not.toContain('Lib');
    const framing = scene('cluster:X').frames.filter(({ members }) => members.includes('Lib'));
    expect(framing.map(({ id }) => id)).toEqual(['frame:F-1']);
    expect(scene('cluster:X').edges.map(({ id }) => id)).toContain('F-2->Lib');
  });
});
