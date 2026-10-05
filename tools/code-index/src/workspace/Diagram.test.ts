//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import { describe, test } from 'vitest';

import * as Diagram from './Diagram.ts';

const failure = (result: Result.Result<string, Diagram.Problem>): string | undefined =>
  Result.isFailure(result) ? result.failure.message : undefined;

describe('Diagram', () => {
  describe('check', () => {
    test('accepts DSL source as written', ({ expect }) => {
      const source = 'diagram flow=right\nnode A "Alpha"\nnode B below A\nedge A depends-on B "uses"';
      expect(Result.getOrThrow(Diagram.check(source))).toEqual(source);
    });

    test('reports each error with its line and column', ({ expect }) => {
      expect(failure(Diagram.check('node A\nedge A -> Missing'))).toMatch(/^The diagram does not read:\n {2}2:\d+ /);
    });

    test('rejects a document with no boxes', ({ expect }) => {
      expect(failure(Diagram.check('# nothing here'))).toContain('has no nodes');
    });
  });

  describe('print', () => {
    test('writes groups with their members, quoting what the grammar needs', ({ expect }) => {
      const source = Diagram.print({
        flow: 'down',
        groups: [{ id: 'core', label: 'Core' }, { id: 'empty' }],
        nodes: [
          { id: '@dxos/echo', label: 'echo', group: 'core', ref: 'https://dxos.org/deus/package/echo' },
          { id: 'node', label: 'A  long\nlabel' },
        ],
        edges: [{ from: '@dxos/echo', to: 'node', relation: 'owns', label: 'holds "it"' }],
      });
      expect(source).toEqual(
        [
          'diagram flow=down',
          'group core "Core" {',
          '  node "@dxos/echo" "echo" ref="https://dxos.org/deus/package/echo"',
          '}',
          'node "node" "A long label"',
          'edge "@dxos/echo" owns "node" "holds \\"it\\""',
        ].join('\n'),
      );
      expect(Result.isSuccess(Diagram.check(source))).toBe(true);
    });
  });

  describe('print options', () => {
    test('drops plain edges a longer path implies, keeping labelled ones', ({ expect }) => {
      const source = Diagram.print({
        reduce: true,
        nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'a', to: 'c' },
          { from: 'a', to: 'c', label: 'direct' },
        ],
      });
      expect(source.split('\n').filter((line) => line.startsWith('edge'))).toEqual([
        'edge a -> b',
        'edge b -> c',
        'edge a -> c "direct"',
      ]);
    });

    test('renames a group that shares an id with a box', ({ expect }) => {
      const source = Diagram.print({ groups: [{ id: 'core' }], nodes: [{ id: 'core', group: 'core' }] });
      expect(source).toEqual('group group_core "core" {\n  node core\n}');
      expect(Result.isSuccess(Diagram.check(source))).toBe(true);
    });
  });

  describe('read', () => {
    test('prints a graph value as DSL, mapping the kinds stored before the DSL', ({ expect }) => {
      const source = Result.getOrThrow(
        Diagram.read(
          JSON.stringify({
            direction: 'LR',
            groups: [],
            nodes: [{ id: 'a', label: 'A' }],
            edges: [{ from: 'a', to: 'b', kind: 'inheritance' }],
          }),
        ),
      );
      expect(source).toEqual('diagram flow=right\nnode a "A"\nnode b\nedge a extends b');
    });

    test('names a mermaid flowchart rather than reporting it as DSL errors', ({ expect }) => {
      expect(failure(Diagram.read('%% old\ngraph TD; a --> b'))).toContain('mermaid');
    });

    test('rejects JSON that is not a graph', ({ expect }) => {
      expect(failure(Diagram.read('{"nodes": 3}'))).toContain('not a valid');
    });
  });
});
