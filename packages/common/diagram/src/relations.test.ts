//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parse as parseDsl, printCommands, read } from './dsl/index.ts';
import { markers, parse as parseMermaid } from './mermaid.ts';
import * as Scene from './scene.ts';
import { relationStyle } from './uml.ts';

describe('relations', () => {
  test('each relation derives its markers, and head/tail still override', ({ expect }) => {
    expect(Scene.markersOf({ relation: 'inheritance' })).toEqual({ end: 'triangle', dashed: false });
    expect(Scene.markersOf({ relation: 'implementation' })).toEqual({ end: 'triangle', dashed: true });
    expect(Scene.markersOf({ relation: 'composition' })).toEqual({ start: 'diamond-filled', dashed: false });
    expect(Scene.markersOf({ relation: 'aggregation' })).toEqual({ start: 'diamond', dashed: false });
    expect(Scene.markersOf({ relation: 'one-to-many' })).toEqual({ start: 'one', end: 'crowsfoot', dashed: false });
    expect(Scene.markersOf({ relation: 'many-to-many' })).toEqual({
      start: 'crowsfoot',
      end: 'crowsfoot',
      dashed: false,
    });
    expect(Scene.markersOf({ relation: 'dependency' })).toEqual({ end: 'open', dashed: true });
    // Documents from before relations keep drawing as they did.
    expect(Scene.markersOf({})).toEqual({ end: 'arrow', dashed: false });
    expect(Scene.markersOf({ head: 'triangle', tail: 'circle' })).toEqual({
      start: 'circle',
      end: 'triangle',
      dashed: false,
    });
    expect(Scene.markersOf({ relation: 'inheritance', head: 'none' })).toEqual({ dashed: false });
  });

  test('the DSL relationship words', ({ expect }) => {
    const { diagram, problems } = read(`
      node Animal  node Dog  node Shape  node Square  node Order  node Line  node Team  node Member
      node Customer  node Student  node Course  node App  node Log
      edge Dog extends Animal
      edge Square implements Shape
      edge Order composes Line
      edge Team owns Member
      edge Customer one-to-many Order
      edge Student many-to-many Course
      edge App depends-on Log
      edge App -> Log
    `);
    expect(problems).toEqual([]);
    expect(diagram?.edges.map((edge) => `${edge.from.node}:${edge.relation ?? '-'}:${edge.to.node}`)).toEqual([
      'Dog:inheritance:Animal',
      'Square:implementation:Shape',
      'Order:composition:Line',
      'Team:aggregation:Member',
      'Customer:one-to-many:Order',
      'Student:many-to-many:Course',
      'App:dependency:Log',
      'App:-:Log',
    ]);
  });

  test('an unknown relationship word is an error on the word', ({ expect }) => {
    const text = 'node A\nnode B\nedge A loves B';
    const [problem] = parseDsl(text).problems;
    expect(text.slice(problem.from, problem.to)).toBe('loves');
  });

  test('laid-out edges carry their relation, and the scene round-trips through print and parse', ({ expect }) => {
    const { commands } = parseDsl(
      'node Animal\nnode Dog below Animal\nedge Dog extends Animal\nnode Leg below Dog\nedge Dog composes Leg',
    );
    const edges = commands.flatMap((command) =>
      command.op === 'upsert-object' && command.object.id === 'edges' ? command.object.elements : [],
    );
    const relations = edges.flatMap((element) => (element.kind === 'arrow' ? [element.relation] : []));
    expect(relations).toEqual(['inheritance', 'composition']);
    const printed = printCommands(commands);
    expect(printed).toContain('relation=inheritance');
    expect(printCommands(parseDsl(printed).commands)).toBe(printed);
  });

  test('mermaid tokens, UML class relations and DSL words agree', ({ expect }) => {
    const graph = parseMermaid(
      ['flowchart TB', '  B --|> A', '  C ..|> A', '  E o--> F', '  G --{ H', '  I -.-> J'].join('\n'),
    );
    expect(graph.edges.map(({ kind }) => markers(kind).relation)).toEqual([
      'inheritance',
      'implementation',
      'aggregation',
      'one-to-many',
      'dependency',
    ]);
    expect(
      (['inheritance', 'realization', 'composition', 'aggregation', 'dependency', 'association'] as const).map(
        (kind) => relationStyle(kind).relation,
      ),
    ).toEqual(['inheritance', 'implementation', 'composition', 'aggregation', 'dependency', undefined]);
  });
});
