//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Diagnostics from './diagnostics.ts';
import { parse, read, toScene } from './dsl/parse.ts';
import { print } from './dsl/print.ts';
import type * as Scene from './scene.ts';

const LOGIN = `
diagram kind=sequence
node User "User" role=actor
node App "Composer"
node Edge "EDGE"
node Db "Space DB"
edge User -> App "open space"
edge App calls Edge "query"
edge Edge calls Db "load"
edge Db returns Edge "docs"
note Edge "merge"
edge Edge returns App "objects"
fragment loop "every 5s" {
  edge App sends Edge "heartbeat"
}
fragment alt "cached" {
  edge App calls App "read cache"
} else "miss" {
  edge App calls Edge "fetch"
  edge Edge returns App "rows"
}
note App, Edge "replicated"
`;

const objectOf = (objects: readonly Scene.WorldObject[], id: string) => objects.find((object) => object.id === id);

const elementsOf = (text: string) => objectOf(toScene(parse(text).commands).objects, 'edges')?.elements ?? [];

/** The absolute y of each message arrow, in source order. */
const rowsOf = (text: string): number[] =>
  elementsOf(text).flatMap((element) => (element.kind === 'arrow' && element.end ? [element.end.y] : []));

describe('sequence diagrams', () => {
  test('reads participants, messages, notes and fragments into a timeline', ({ expect }) => {
    const { diagram, problems } = read(LOGIN);
    expect(problems).toEqual([]);
    expect(diagram?.kind).toBe('sequence');
    expect(diagram?.nodes.map((node) => node.id)).toEqual(['User', 'App', 'Edge', 'Db']);
    expect(diagram?.nodes[0].role).toBe('actor');
    expect(diagram?.timeline.map((step) => step.kind)).toEqual([
      'message',
      'message',
      'message',
      'message',
      'note',
      'message',
      'fragment',
      'fragment',
      'note',
    ]);
    const alt = diagram?.timeline[7];
    expect(alt?.kind === 'fragment' && alt.fragment.sections.map((section) => section.guard)).toEqual([
      'cached',
      'miss',
    ]);
    expect(diagram?.edges.map((edge) => edge.message)).toEqual([
      undefined,
      'call',
      'call',
      'return',
      'return',
      'send',
      'call',
      'call',
      'return',
    ]);
  });

  test('lays out without layout errors, every message on its own row going down', ({ expect }) => {
    const { commands, problems } = parse(LOGIN);
    expect(problems).toEqual([]);
    const report = Diagnostics.analyze(toScene(commands).objects);
    expect(Diagnostics.errors(report)).toEqual([]);
    expect(report.metrics.crossings).toBe(0);
    const rows = rowsOf(LOGIN);
    expect(rows).toHaveLength(9);
    rows.slice(1).forEach((row, index) => expect(row).toBeGreaterThan(rows[index]));
  });

  test('participants are columns in declaration order, group members together', ({ expect }) => {
    const { commands } = parse(`
      diagram kind=sequence
      node A
      group back "Backend" { node B  node C }
      node D
      edge A -> D
    `);
    const objects = toScene(commands).objects;
    const xs = ['A', 'B', 'C', 'D'].map((id) => objectOf(objects, id)?.origin?.x ?? NaN);
    expect(xs).toEqual([...xs].sort((left, right) => left - right));
    const frame = objectOf(objects, 'back');
    expect(frame?.elements[0]).toMatchObject({ kind: 'line', guide: true });
  });

  test('a call opens an activation and its return closes it', ({ expect }) => {
    const elements = elementsOf(`
      diagram kind=sequence
      node A
      node B
      edge A calls B "go"
      edge B returns A "done"
    `);
    const bars = elements.filter((element) => element.kind === 'rect' && element.id.startsWith('activation'));
    expect(bars).toHaveLength(1);
    const [call, back] = elements.filter((element) => element.kind === 'arrow');
    const bar = bars[0];
    expect(bar.kind === 'rect' && call.kind === 'arrow' && back.kind === 'arrow' && [bar.y, bar.y + bar.h]).toEqual([
      call.kind === 'arrow' && call.end?.y,
      back.kind === 'arrow' && back.end?.y,
    ]);
    // A return is dashed with an open head; an async send is solid with an open head.
    expect(back).toMatchObject({ relation: 'dependency' });
  });

  test('labels widen the gap between the lifelines they span', ({ expect }) => {
    const gap = (label: string) => {
      const objects = toScene(parse(`diagram kind=sequence\nnode A\nnode B\nedge A -> B "${label}"`).commands).objects;
      return (objectOf(objects, 'B')?.origin?.x ?? 0) - (objectOf(objects, 'A')?.origin?.x ?? 0);
    };
    expect(gap('x'.repeat(60))).toBeGreaterThan(gap('x'));
    expect(gap('x'.repeat(60))).toBeGreaterThanOrEqual(60 * 12);
  });

  test('warns about hints the order of statements overrides and an unmatched return', ({ expect }) => {
    const text = `
      diagram kind=sequence
      node A
      node B right-of A
      edge A -> B via 10,_
      edge B returns A
    `;
    const messages = parse(text).problems.map(({ severity, message }) => `${severity}: ${message}`);
    expect(messages).toEqual([
      'warning: A placement relation is ignored in a sequence diagram: the order of statements is the layout.',
      'warning: A waypoint is ignored in a sequence diagram: the order of statements is the layout.',
      'warning: "B" returns to "A" with no open call to return from.',
    ]);
  });

  test('sequence statements outside a sequence diagram are errors', ({ expect }) => {
    const text = `
      node A
      node B
      edge A calls B
      note A "hi"
      fragment loop { edge A -> B }
    `;
    const problems = parse(text).problems.filter(({ severity }) => severity === 'error');
    expect(problems.map(({ message }) => message)).toEqual([
      '"calls" belongs in a sequence diagram; declare `diagram kind=sequence`.',
      'A note belongs in a sequence diagram; declare `diagram kind=sequence`.',
      'A fragment belongs in a sequence diagram; declare `diagram kind=sequence`.',
    ]);
  });

  test('else belongs to alt and par only', ({ expect }) => {
    const { problems } = read('diagram kind=sequence\nnode A\nfragment loop { edge A -> A } else { edge A -> A }');
    expect(problems.map(({ message }) => message)).toEqual([
      'Only alt and par take `else`; a loop fragment has one section.',
    ]);
  });

  test('note, fragment and else stay usable as ids', ({ expect }) => {
    const { diagram, problems } = read(
      'diagram kind=sequence\nnode note\nnode fragment\nedge note -> fragment\nnote note "hi"',
    );
    expect(problems).toEqual([]);
    expect(diagram?.nodes.map((node) => node.id)).toEqual(['note', 'fragment']);
    const scene = 'object else @ 0,0 {\n  text note 0,0 "x"\n  line lifeline 0,0 0,10 guide=true\n}\n';
    expect(print(toScene(parse(scene).commands))).toEqual(scene);
  });

  test('a note left of the first participant widens nothing and stays on the canvas', ({ expect }) => {
    const { commands, problems } = parse(
      'diagram kind=sequence\nnode A\nnode B\nnote A:left "a long note on the left"\nnote C "?"',
    );
    expect(problems.map(({ message }) => message)).toEqual(['Unknown node "C"; declare it with `node C`.']);
    const objects = toScene(commands).objects;
    const note = objectOf(objects, 'edges')?.elements.find((element) => element.id === 'note-0');
    const origin = objectOf(objects, 'edges')?.origin?.x ?? NaN;
    expect(note?.kind === 'rect' && note.x + origin).toBeGreaterThanOrEqual(0);
  });
});
