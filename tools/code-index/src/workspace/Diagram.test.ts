//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import { describe, test } from 'vitest';

import { Mermaid } from '@dxos/diagram';
import { EffectEx } from '@dxos/effect';

import * as Diagram from './Diagram.ts';

const failure = (result: Result.Result<Diagram.Graph, Diagram.Problem>): string | undefined =>
  Result.isFailure(result) ? result.failure.message : undefined;

describe('Diagram', () => {
  describe('prepare', () => {
    test('keeps a flowchart statement per line', ({ expect }) => {
      expect(Diagram.prepare('graph LR\n  echo["@dxos/echo"]\n\n  echo --> keys["@dxos/keys"]')).toEqual({
        kind: 'flowchart',
        source: 'graph LR\necho["@dxos/echo"]\necho --> keys["@dxos/keys"]',
      });
    });

    test('splits semicolon statements and chained edges into one edge per line', ({ expect }) => {
      expect(Diagram.prepare('graph TD; A["x; y"] --> B -->|uses| C;\n%% ref A src/a.ts')).toEqual({
        kind: 'flowchart',
        source: ['graph TD', 'A["x; y"] --> B', 'B -->|uses| C', '%% ref A src/a.ts'].join('\n'),
      });
    });

    test('expands `&` operands into one edge per pair, leaving an `&` inside a label alone', ({ expect }) => {
      expect(Diagram.prepare('graph TD\n  A & B --> C["x & y"] & D')).toEqual({
        kind: 'flowchart',
        source: ['graph TD', 'A --> C["x & y"]', 'A --> D', 'B --> C["x & y"]', 'B --> D'].join('\n'),
      });
    });

    test('reports the kinds the illustrator cannot lay out', ({ expect }) => {
      expect(Diagram.prepare('%% a comment\nsequenceDiagram\n  A->>B: hi')).toEqual({
        kind: 'unsupported',
        type: 'sequenceDiagram',
      });
      expect(Diagram.prepare('  ')).toEqual({ kind: 'unsupported', type: 'empty' });
    });
  });

  describe('normalize', () => {
    test('declares what edges and nodes name, defaults labels and drops empty groups', ({ expect }) => {
      expect(
        Result.getOrThrow(
          Diagram.fromValue({
            groups: [{ id: 'empty', label: 'Nobody' }, { id: 'b', label: 'Second' }, { id: 'a' }],
            nodes: [
              { id: 'x', group: 'a' },
              { id: 'y', group: 'b', label: 'Why' },
              { id: 'z', group: 'undeclared' },
            ],
            edges: [
              { from: 'x', to: 'w', kind: 'reference' },
              { from: 'y', to: 'x', kind: 'inheritance', label: 'is a' },
            ],
          }),
        ),
      ).toEqual({
        direction: 'TB',
        groups: [
          { id: 'b', label: 'Second' },
          { id: 'a', label: 'a' },
          { id: 'undeclared', label: 'undeclared' },
        ],
        nodes: [
          { id: 'x', label: 'x', group: 'a' },
          { id: 'y', label: 'Why', group: 'b' },
          { id: 'z', label: 'z', group: 'undeclared' },
          { id: 'w', label: 'w' },
        ],
        edges: [
          { from: 'x', to: 'w' },
          { from: 'y', to: 'x', label: 'is a', kind: 'inheritance' },
        ],
      });
    });

    test('rejects what is not a spec, and a spec with no boxes, with a message the model can act on', ({ expect }) => {
      expect(failure(Diagram.fromValue({ edges: [] }))).toContain('not a valid { nodes, edges, groups } spec');
      expect(
        failure(Diagram.fromValue({ nodes: [{ id: 'a' }], edges: [{ from: 'a', to: 'b', kind: 'calls' }] })),
      ).toBeDefined();
      expect(failure(Diagram.fromValue({ nodes: [] }))).toEqual('The diagram has no nodes.');
    });
  });

  describe('read', () => {
    test('reads mermaid through the illustrator parser, keeping groups, edge kinds, labels and refs', ({ expect }) => {
      const source = [
        'flowchart LR',
        '  subgraph core [Core]',
        '    A[Alpha]',
        '  end',
        '  B --|> A',
        '  A -->|uses| C',
        '  %% ref A src/a.ts',
      ].join('\n');
      expect(Result.getOrThrow(Diagram.read(source))).toEqual({
        direction: 'LR',
        groups: [{ id: 'core', label: 'Core' }],
        nodes: [
          { id: 'A', label: 'Alpha', group: 'core', ref: 'src/a.ts' },
          { id: 'B', label: 'B' },
          { id: 'C', label: 'C' },
        ],
        edges: [
          { from: 'B', to: 'A', kind: 'inheritance' },
          { from: 'A', to: 'C', label: 'uses' },
        ],
      });
    });

    test('reads the stored JSON graph', ({ expect }) => {
      const graph = Result.getOrThrow(Diagram.read('graph TD; a --> b'));
      expect(Result.getOrThrow(Diagram.read(JSON.stringify(graph)))).toEqual(graph);
    });

    test('explains a diagram it cannot draw', ({ expect }) => {
      expect(failure(Diagram.read('sequenceDiagram\n  A->>B: hi'))).toContain('flowcharts only, not sequenceDiagram');
      expect(failure(Diagram.read('graph TD\n  ??? --> !!!'))).toContain('no nodes');
      expect(failure(Diagram.read('{ not json'))).toContain('neither a JSON spec nor a mermaid flowchart');
    });

    test('`stored` is the normalized graph as JSON, or the problem', async ({ expect }) => {
      expect(JSON.parse(await EffectEx.runPromise(Diagram.stored('graph LR; a --> b')))).toMatchObject({
        direction: 'LR',
        nodes: [{ id: 'a' }, { id: 'b' }],
      });
      expect((await EffectEx.runPromise(Effect.flip(Diagram.stored('pie')))).message).toContain('flowcharts only');
    });
  });

  describe('toSource', () => {
    test('round-trips through the illustrator parser under parser-safe ids', ({ expect }) => {
      const graph = Result.getOrThrow(
        Diagram.fromValue({
          direction: 'LR',
          groups: [{ id: 'pkg/core', label: 'Core [lib]' }],
          nodes: [
            { id: '@dxos/echo', label: 'echo "db"', group: 'pkg/core', ref: 'packages/core/echo/echo' },
            { id: '@dxos-echo', label: 'clash' },
            { id: 'end', label: 'multi\nline' },
          ],
          edges: [
            { from: '@dxos/echo', to: '@dxos-echo', label: 'a | b' },
            { from: 'end', to: '@dxos/echo', kind: 'implements' },
            { from: '@dxos-echo', to: 'end', kind: 'contains' },
            { from: 'end', to: '@dxos-echo', kind: 'hasMany' },
            { from: '@dxos/echo', to: 'end', kind: 'creates' },
          ],
        }),
      );
      const ids = Diagram.objectIds(graph);
      expect([...ids.values()]).toEqual(['_dxos_echo', '_dxos_echo_2', 'end']);
      const id = (key: string) => ids.get(key) ?? key;
      expect(Mermaid.parse(Diagram.toSource(graph))).toEqual({
        direction: 'LR',
        groups: [{ id: 'group_pkg_core', label: 'Core [lib]', children: [id('@dxos/echo')] }],
        nodes: [
          {
            id: id('@dxos/echo'),
            label: 'echo "db"',
            group: 'group_pkg_core',
            ref: 'packages/core/echo/echo',
          },
          { id: id('@dxos-echo'), label: 'clash' },
          { id: 'end', label: 'multi line' },
        ],
        edges: [
          { from: id('@dxos/echo'), to: id('@dxos-echo'), kind: 'reference', label: 'a / b' },
          { from: 'end', to: id('@dxos/echo'), kind: 'implements' },
          { from: id('@dxos-echo'), to: 'end', kind: 'contains' },
          { from: 'end', to: id('@dxos-echo'), kind: 'hasMany' },
          { from: id('@dxos/echo'), to: 'end', kind: 'creates' },
        ],
      });
    });
  });
});
