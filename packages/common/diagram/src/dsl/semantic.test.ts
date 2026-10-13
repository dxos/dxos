//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Scene from '../scene.ts';
import { parse, read } from './parse.ts';
import { formatId } from './print.ts';

/** The problems of a document as `severity: text-at-range`, so a test names what each one underlines. */
const problemsOf = (text: string) =>
  parse(text).problems.map(({ severity, from, to }) => `${severity}: ${text.slice(from, to)}`);

const messagesOf = (text: string) =>
  parse(text)
    .problems.map(({ message }) => message)
    .join('\n');

describe('semantic statements', () => {
  test('diagram attributes', ({ expect }) => {
    const { diagram, problems } = read('diagram @ 10,20 flow=right grid=384x224 box=160x64\nnode A');
    expect(problems).toEqual([]);
    expect(diagram?.flow).toBe('right');
    expect(diagram?.origin).toEqual({ x: 10, y: 20 });
    expect(diagram?.grid).toEqual({ w: 384, h: 224 });
    expect(diagram?.box).toEqual({ w: 160, h: 64 });
    expect(diagram?.hinted).toBe(true);
  });

  test('nodes: label, ref, style, pins and relations', ({ expect }) => {
    const { diagram, problems } = read(`
      node A "Alpha" ref="packages/a" color=blue shape=ellipse @cell(1,2)
      node B right-of A ~below A
      node C @ 384,0
    `);
    expect(problems).toEqual([]);
    const [a, b, c] = diagram?.nodes ?? [];
    expect(a).toMatchObject({
      id: 'A',
      label: 'Alpha',
      ref: 'packages/a',
      color: 'blue',
      shape: 'ellipse',
      pin: { kind: 'cell', col: 1, row: 2 },
    });
    expect(b.label).toBe('B');
    expect(b.relations.map(({ kind, target, soft }) => ({ kind, target, soft }))).toEqual([
      { kind: 'right-of', target: 'A', soft: false },
      { kind: 'below', target: 'A', soft: true },
    ]);
    expect(c.pin).toMatchObject({ kind: 'point', x: 384, y: 0 });
  });

  test('groups hold nodes and edges and relate to each other', ({ expect }) => {
    const { diagram, problems } = read(`
      group left "Left" { node A  node B  edge A -> B }
      group right "Right" right-of left gap=64 color=yellow { node C }
    `);
    expect(problems).toEqual([]);
    expect(diagram?.nodes.map(({ id, group }) => `${id}:${group}`)).toEqual(['A:left', 'B:left', 'C:right']);
    expect(diagram?.groups[1]).toMatchObject({ id: 'right', label: 'Right', gap: 64, color: 'yellow' });
    expect(diagram?.groups[1].relations[0]).toMatchObject({ kind: 'right-of', target: 'left', soft: false });
    expect(diagram?.edges).toHaveLength(1);
  });

  test('edges: sides, two-way, no head, fans, waypoints and style', ({ expect }) => {
    const { diagram, problems } = read(`
      node A  node B  node C
      edge A:right -> B:top|left "calls" stroke=dashed head=triangle
      edge A <-> B "talks"
      edge B -- C
      edge A -> B, C "both"
      edge A -> C via 600,_ cell(1.5,_) _,40
    `);
    expect(problems).toEqual([]);
    const edges = diagram?.edges ?? [];
    expect(edges[0]).toMatchObject({
      from: { node: 'A', sides: ['right'] },
      to: { node: 'B', sides: ['top', 'left'] },
      label: 'calls',
      stroke: 'dashed',
      head: 'triangle',
    });
    // A two-way edge is two connectors; only the first carries the label.
    expect(edges.slice(1, 3).map(({ from, to, label }) => `${from.node}->${to.node}:${label ?? ''}`)).toEqual([
      'A->B:talks',
      'B->A:',
    ]);
    expect(edges[3].head).toBe('none');
    // Without `bus`, a fan is one labelled edge per target.
    expect(edges.slice(4, 6).map(({ to, label }) => `${to.node}:${label}`)).toEqual(['B:both', 'C:both']);
    expect(edges[6].via.map(({ x, y, unit }) => ({ x, y, unit }))).toEqual([
      { x: 600, y: undefined, unit: 'scene' },
      { x: 1.5, y: undefined, unit: 'cell' },
      { x: undefined, y: 40, unit: 'scene' },
    ]);
  });

  test('edges: `tail=arrow` is one connector headed at both ends', ({ expect }) => {
    const { diagram, problems } = read(`
      node A  node B
      edge A -> B "syncs" tail=arrow
    `);
    expect(problems).toEqual([]);
    expect(diagram?.edges).toHaveLength(1);
    expect(diagram?.edges[0]).toMatchObject({ label: 'syncs', tail: 'arrow' });
    expect(Scene.markersOf({ tail: 'arrow' })).toEqual({
      start: 'arrow',
      end: 'arrow',
      dashed: false,
    });
  });

  test('buses: a fan with `bus`, and named buses across statements', ({ expect }) => {
    const { diagram, problems } = read(`
      node H  node A  node B  node C
      edge H -> A, B "trunk" bus
      edge A -> C "one" bus=into
      edge B -> C "two" bus=into
    `);
    expect(problems).toEqual([]);
    const edges = diagram?.edges ?? [];
    expect(edges[0].bus).toBe(edges[1].bus);
    expect(edges[0].label).toBeUndefined();
    expect([...(diagram?.busLabels.values() ?? [])]).toEqual(['trunk']);
    expect(edges[2].bus).toMatch(/\|in$/);
    expect(edges[2].label).toBe('one');
  });

  test('soft sides, group shape and aspect', ({ expect }) => {
    const { diagram, problems } = read(`
      diagram aspect=16:9
      group g "G" compact max-width=3 { node A }
      node B
      edge A:~left|top -> B:bottom
    `);
    expect(problems).toEqual([]);
    expect(diagram?.aspect).toBeCloseTo(16 / 9);
    expect(diagram?.groups[0]).toMatchObject({ id: 'g', compact: true, maxWidth: 3 });
    expect(diagram?.edges[0].from).toMatchObject({ sides: ['left', 'top'], soft: true });
    expect(diagram?.edges[0].to.soft).toBeUndefined();
    expect(diagram?.hinted).toBe(true);
  });

  test('a fan-in bus gathers into its target', ({ expect }) => {
    const { diagram, problems } = read('node A  node B  node C  node D\nedge A, B, C -> D "joins" bus');
    expect(problems).toEqual([]);
    const keys = new Set(diagram?.edges.map((edge) => edge.bus));
    expect([...keys]).toHaveLength(1);
    expect([...keys][0]).toMatch(/^D\|.*\|in$/);
    expect([...(diagram?.busLabels.values() ?? [])]).toEqual(['joins']);
  });

  test('a bus the engine cannot honour is reported', ({ expect }) => {
    expect(problemsOf('node A\nnode B\nedge A -> B bus')).toEqual(['warning: bus']);
    expect(problemsOf('node A\nnode B\nedge A -> B bus=solo')).toEqual(['warning: bus=solo']);
    expect(problemsOf('node A\nnode B\nnode C\nedge A -> B, C bus via 10,_')).toEqual(['warning: 10,_']);
  });

  test('every problem names its source', ({ expect }) => {
    expect(problemsOf('node A\nedge A -> Missing')).toEqual(['error: Missing']);
    expect(problemsOf('node A\nnode B sideways-of A')).toEqual(['error: sideways-of']);
    expect(problemsOf('node A\nnode B\nedge A:middle -> B')).toEqual(['error: middle']);
    expect(problemsOf('node A below Nobody')).toEqual(['error: below Nobody']);
    expect(problemsOf('node A below A')).toEqual(['error: below A']);
    expect(problemsOf('node A\nnode A')).toEqual(['error: A']);
    expect(problemsOf('group g { group h { node A } }')).toEqual(['error: h']);
    expect(problemsOf('node A @cell(1.5,2)')).toEqual(['error: cell(1.5,2)']);
    expect(problemsOf('node A\nnode B\nedge A -> B via _,_')).toEqual(['error: _,_']);
    expect(problemsOf('node A\nnode B\nnode C\nnode D\nedge A, B -> C, D bus')).toEqual(['error: bus']);
    expect(problemsOf('node A colour=red')).toEqual(['error: colour=red']);
    expect(problemsOf('diagram grid=big\nnode A')).toEqual(['error: grid=big']);
    expect(problemsOf('diagram aspect=wide\nnode A')).toEqual(['error: aspect=wide']);
    expect(problemsOf('group g max-width=1.5 { node A }')).toEqual(['error: max-width=1.5']);
  });

  test('contradictions are relaxed with a warning, and the diagram still lays out', ({ expect }) => {
    // Two pins on one cell: the second pin is dropped.
    expect(problemsOf('node A @cell(0,0)\nnode B @cell(0,0)')).toEqual(['warning: @cell(0,0)']);
    // A relation the pins contradict.
    expect(problemsOf('node A @cell(0,0)\nnode B @cell(0,1) right-of A')).toEqual(['warning: right-of A']);
    // Relations that cannot all hold.
    const cycle = parse('node A right-of B\nnode B right-of A');
    expect(cycle.problems.map(({ severity }) => severity)).toEqual(['warning']);
    expect(cycle.commands.length).toBeGreaterThan(0);
  });

  test('a scene statement claiming a laid-out id is flagged', ({ expect }) => {
    expect(problemsOf('node A\nobject A @ 0,0 { rect box 0,0 10x10 }')[0]).toMatch(/^warning: object A/);
  });

  test('the new keywords are reserved, so the printer quotes them as ids', ({ expect }) => {
    for (const word of ['diagram', 'group', 'node', 'edge', 'cell', 'via', 'bus', 'compact']) {
      expect(formatId(word)).toBe(`"${word}"`);
    }
    // Relation words and sides stay usable as ids.
    expect(formatId('left')).toBe('left');
    expect(formatId('below')).toBe('below');
  });

  test('an inherited property name is not a relationship', ({ expect }) => {
    for (const word of ['constructor', 'toString', '__proto__']) {
      expect(messagesOf(`node A\nnode B\nedge A ${word} B`)).toMatch(/Unknown relationship/);
    }
  });

  test("no node or group may take the connectors object's id", ({ expect }) => {
    expect(messagesOf('node edges\nnode B')).toMatch(/"edges" names the diagram's connectors object/);
    expect(messagesOf('group edges { node A }')).toMatch(/"edges" names the diagram's connectors object/);
  });

  test('a document of scene statements alone has no diagram', ({ expect }) => {
    expect(read('object A @ 0,0 { rect box 0,0 10x10 }').diagram).toBeUndefined();
  });
});
