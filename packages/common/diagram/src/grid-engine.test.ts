//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Shape, solveGrids } from '@dxos/scene';

import { parse, read } from './dsl/parse.ts';
import { HEADING, OBJECT, bodyId, headingId } from './grid-engine.ts';

const elementsOf = (text: string): readonly Shape.Element[] =>
  parse(text).commands.flatMap((command) => (command.op === 'upsert-object' ? command.object.elements : []));

const messagesOf = (text: string): string[] =>
  parse(text).problems.map(({ severity, message }) => `${severity}: ${message}`);

const BOX_KINDS: readonly string[] = Shape.BoxKind.literals;
const boxesOf = (text: string): Shape.Box[] =>
  elementsOf(text).filter((element): element is Shape.Box => BOX_KINDS.includes(element.kind));

const placed = { x: 0, y: 0, w: 0, h: 0 };

describe('grid diagrams', () => {
  test('a diagram is one object, whose frame its tracks divide among the members in source order', ({ expect }) => {
    const text = 'diagram kind=grid @ 10,20 size=900x300 cols=3 gap=24 padding=24\nnode a "One"\nnode b "Two"\nnode c';
    const { commands, problems } = parse(text);
    expect(problems).toEqual([]);
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({ op: 'upsert-object', object: { id: OBJECT, origin: { x: 10, y: 20 } } });
    expect(elementsOf(text)).toEqual([
      { kind: 'grid', id: OBJECT, x: 0, y: 0, w: 900, h: 300, cols: 3, gap: 24, padding: 24 },
      { kind: 'rect', id: 'a', ...placed, text: 'One', parent: OBJECT },
      { kind: 'rect', id: 'b', ...placed, text: 'Two', parent: OBJECT },
      // A plain box with no label shows its id, as it does in every other kind.
      { kind: 'rect', id: 'c', ...placed, text: 'c', parent: OBJECT },
    ]);
    // The frames are the rule's result: three equal shares of what the padding and the gaps leave.
    const frames = solveGrids(boxesOf(text));
    expect(frames.get('a')).toEqual({ x: 24, y: 24, w: 268, h: 252 });
    expect(frames.get('c')).toEqual({ x: 608, y: 24, w: 268, h: 252 });
  });

  test('a labelled group is a heading over its members; an unlabelled one is only their grid', ({ expect }) => {
    const text = `
      diagram kind=grid size=800x600
      group services "Services" gap=12 { node api "API" }
      group plain cols=2 padding=8 { node left "L" }
    `;
    expect(messagesOf(text)).toEqual([]);
    expect(elementsOf(text).slice(1)).toEqual([
      { kind: 'grid', id: 'services', ...placed, rows: `${HEADING.height} 1fr`, gap: HEADING.gap, parent: OBJECT },
      {
        kind: 'rect',
        id: headingId('services'),
        ...placed,
        text: 'Services',
        parent: 'services',
        fill: 'none',
        border: false,
        align: 'center',
        valign: 'middle',
        fontSize: HEADING.fontSize,
      },
      { kind: 'grid', id: bodyId('services'), ...placed, gap: 12, parent: 'services' },
      { kind: 'rect', id: 'api', ...placed, text: 'API', parent: bodyId('services') },
      { kind: 'grid', id: 'plain', ...placed, cols: 2, padding: 8, parent: OBJECT },
      { kind: 'rect', id: 'left', ...placed, text: 'L', parent: 'plain' },
    ]);
  });

  test('groups nest, an empty one keeps its cell, and members stay in the order written', ({ expect }) => {
    const text = `
      diagram kind=grid size=800x600
      group outer rows="auto 1fr" {
        node first
        group inner cols=3 {
          group one { node a }
          group blank { }
          group three { node c }
        }
        node last
      }
    `;
    expect(messagesOf(text)).toEqual([]);
    expect(boxesOf(text).map(({ id, parent }) => `${parent ?? ''}/${id}`)).toEqual([
      `/${OBJECT}`,
      `${OBJECT}/outer`,
      'outer/first',
      'outer/inner',
      'inner/one',
      'one/a',
      'inner/blank',
      'inner/three',
      'three/c',
      'outer/last',
    ]);
  });

  test('a node naming a component carries its fields, and shows no text it was not given', ({ expect }) => {
    const text = `
      diagram kind=grid size=800x600
      node field kind=substrate seed=29 data-fill=0.55 hue=neutral live=true
      node card "Calendar" kind=card icon=calendar-blank stroke=dashed
    `;
    expect(messagesOf(text)).toEqual([]);
    expect(elementsOf(text).slice(1)).toEqual([
      {
        kind: 'rect',
        id: 'field',
        ...placed,
        parent: OBJECT,
        type: 'substrate',
        // `fill` is the node's own style, so the component's field of that name is written escaped.
        data: { seed: 29, fill: 0.55, hue: 'neutral', live: true },
      },
      {
        kind: 'rect',
        id: 'card',
        ...placed,
        text: 'Calendar',
        parent: OBJECT,
        type: 'card',
        data: { icon: 'calendar-blank' },
        stroke: 'dashed',
      },
    ]);
  });

  test('an edge joins two boxes, a box and a group, or a place on a component', ({ expect }) => {
    const text = `
      diagram kind=grid size=800x600
      group side { node a }
      node frame kind=app-frame
      edge a -> frame "reads" head=triangle
      edge a -- frame/nav stroke=dashed
      edge frame#left extends side
    `;
    expect(messagesOf(text)).toEqual([]);
    expect(elementsOf(text).filter((element) => element.kind === 'arrow')).toEqual([
      { kind: 'arrow', id: 'a-frame-0', from: 'a', to: 'frame', text: 'reads', head: 'triangle' },
      { kind: 'arrow', id: 'a-frame/nav-1', from: 'a', to: 'frame/nav', head: 'none', stroke: 'dashed' },
      { kind: 'arrow', id: 'frame#left-side-2', from: 'frame#left', to: 'side', relation: 'inheritance' },
    ]);
  });

  test('a group sizes the tracks it does not state, says where they sit, and draws a frame', ({ expect }) => {
    const text = `
      diagram kind=grid size=800x600 alignContent=center
      group cards "Cards" autoRows=88 gap=12 alignContent=center justifyContent=end border=true stroke=dashed {
        node a
      }
      group wide autoCols=384 fill=tint { node b }
    `;
    expect(messagesOf(text)).toEqual([]);
    const [root, ...rest] = boxesOf(text);
    expect(root).toMatchObject({ id: OBJECT, alignContent: 'center' });
    // The rule and the frame are the members' grid's, so the heading stays outside the frame.
    expect(rest.find(({ id }) => id === 'cards')).toEqual({
      kind: 'grid',
      id: 'cards',
      ...placed,
      rows: `${HEADING.height} 1fr`,
      gap: HEADING.gap,
      parent: OBJECT,
    });
    expect(rest.find(({ id }) => id === bodyId('cards'))).toEqual({
      kind: 'grid',
      id: bodyId('cards'),
      ...placed,
      gap: 12,
      autoRows: 88,
      alignContent: 'center',
      justifyContent: 'end',
      border: true,
      stroke: 'dashed',
      parent: 'cards',
    });
    expect(rest.find(({ id }) => id === 'wide')).toEqual({
      kind: 'grid',
      id: 'wide',
      ...placed,
      autoCols: 384,
      fill: 'tint',
      parent: OBJECT,
    });
    // One card of the stated height, centred in what the heading leaves.
    expect(solveGrids(boxesOf(text)).get('a')?.h).toBe(88);
  });

  test('a group packs its members where it says so, and a node says whether it draws its border', ({ expect }) => {
    const text = `
      diagram kind=grid size=800x600
      group field layout=pack packSeed=29 packMin=36 packMax=185 gap=10 {
        node s0 kind=graph border=true seed=29
        node s1 kind=graph border=false
      }
    `;
    expect(messagesOf(text)).toEqual([]);
    expect(boxesOf(text).slice(1)).toEqual([
      {
        kind: 'grid',
        id: 'field',
        ...placed,
        gap: 10,
        layout: 'pack',
        packSeed: 29,
        packMin: 36,
        packMax: 185,
        parent: OBJECT,
      },
      // `seed` is the component's own; the packing's is named apart from it.
      { kind: 'rect', id: 's0', ...placed, parent: 'field', type: 'graph', data: { seed: 29 }, border: true },
      { kind: 'rect', id: 's1', ...placed, parent: 'field', type: 'graph', border: false },
    ]);
  });

  test('a node keeps the size it states in its cell, and a component field of that name is escaped', ({ expect }) => {
    const text = `
      diagram kind=grid size=800x200 cols=2
      node a "A" width=200 height=50
      node b "B" kind=card data-width=3
    `;
    expect(messagesOf(text)).toEqual([]);
    expect(boxesOf(text).slice(1)).toEqual([
      { kind: 'rect', id: 'a', ...placed, text: 'A', parent: OBJECT, width: 200, height: 50 },
      // `width` is the element's; the component's own field of that name stays in its bag.
      { kind: 'rect', id: 'b', ...placed, text: 'B', parent: OBJECT, type: 'card', data: { width: 3 } },
    ]);
    const frames = solveGrids(boxesOf(text));
    // Two 400-wide cells: `a` sits in the middle of the first at its own size, `b` fills the second.
    expect(frames.get('a')).toEqual({ x: 100, y: 75, w: 200, h: 50 });
    expect(frames.get('b')).toEqual({ x: 400, y: 0, w: 400, h: 200 });
  });

  test('an edge says how it runs, and may end on an empty group that only holds a cell', ({ expect }) => {
    const text = `
      diagram kind=grid size=800x600 cols="1fr 0"
      node a
      group port { }
      edge a -- port path=line stroke=dashed
      edge a#e3 -> port#w1
    `;
    expect(messagesOf(text)).toEqual([]);
    expect(elementsOf(text).filter((element) => element.kind === 'arrow')).toEqual([
      { kind: 'arrow', id: 'a-port-0', from: 'a', to: 'port', head: 'none', path: 'line', stroke: 'dashed' },
      // A port is a place on a box, and a group's frame is a box.
      { kind: 'arrow', id: 'a#e3-port#w1-1', from: 'a#e3', to: 'port#w1' },
    ]);
    expect(solveGrids(boxesOf(text)).get('port')).toEqual({ x: 800, y: 0, w: 0, h: 600 });
  });

  test('a node a component draws states no shape', ({ expect }) => {
    expect(messagesOf('diagram kind=grid size=400x200\nnode a kind=card shape=ellipse')).toEqual([
      'error: "shape" says nothing on a node a component draws; drop it or `kind`.',
    ]);
  });

  test('a place is only looked for on a node that exists', ({ expect }) => {
    const text = 'diagram kind=grid size=800x600\nnode a\nedge a -> ghost/nav';
    expect(messagesOf(text)).toEqual(['error: Unknown node "ghost/nav"; declare it with `node ghost/nav`.']);
    expect(elementsOf(text).filter((element) => element.kind === 'arrow')).toEqual([]);
  });

  test('a grid diagram with no frame is an error, since there is nothing to divide', ({ expect }) => {
    const text = 'diagram kind=grid\nnode a';
    expect(parse(text).commands).toEqual([]);
    expect(messagesOf(text)).toEqual([
      'error: A grid diagram needs a frame to divide: `diagram kind=grid size=1600x900`.',
    ]);
  });

  test('placement and routing hints are ignored with a warning: the order written is the layout', ({ expect }) => {
    const text = `
      diagram kind=grid size=800x600
      node a
      node b right-of a @cell(1,1)
      edge a:right -> b
      edge a -> b via 10,_
    `;
    expect(messagesOf(text)).toEqual([
      'warning: A pin is ignored in a grid diagram: the order of statements is the layout.',
      'warning: A placement relation is ignored in a grid diagram: the order of statements is the layout.',
      'warning: A side is ignored in a grid diagram: the order of statements is the layout.',
      'warning: A waypoint is ignored in a grid diagram: the order of statements is the layout.',
    ]);
  });

  test('an id the heading or the members take is not free for a statement', ({ expect }) => {
    const text = 'diagram kind=grid size=800x600\ngroup g "G" { node a }\nnode g-heading';
    expect(messagesOf(text)).toEqual(['error: "g-heading" names two boxes; choose another id.']);
  });
});

describe('the other kinds', () => {
  test('what only a grid reads says so', ({ expect }) => {
    const text = `
      diagram size=800x600 cols=2
      group g rows=3 padding=4 autoRows=88 alignContent=center border=true { node a kind=card icon=x }
      node b width=120 height=40
      edge a -> b path=line
    `;
    expect(messagesOf(text).sort()).toEqual(
      ['size', 'cols', 'rows', 'padding', 'autoRows', 'alignContent', 'border', 'kind', 'width', 'height', 'path']
        .map((name) => `error: "${name}" belongs in a grid diagram; declare \`diagram kind=grid\`.`)
        .sort(),
    );
  });

  test('a group inside another gives its members to the outermost one', ({ expect }) => {
    const { diagram, problems } = read('group outer { group middle { group inner { node a } }\nnode b }');
    expect(problems.map(({ message }) => message)).toEqual([
      'Groups do not nest; the members of "middle" join "outer".',
      'Groups do not nest; the members of "inner" join "outer".',
    ]);
    expect(diagram?.groups.map(({ id }) => id)).toEqual(['outer']);
    expect(diagram?.nodes.map(({ id, group }) => `${group}/${id}`)).toEqual(['outer/a', 'outer/b']);
  });
});
