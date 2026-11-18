//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as MermaidEngine from '../mermaid-engine.ts';
import type * as Scene from '../scene.ts';
import { BASIC } from '../testing.ts';
import { parse, parseScene, toScene } from './parse.ts';
import { print, printCommands } from './print.ts';

/** Every element kind, every attribute family, in canonical form. */
const KITCHEN_SINK = `object pkgA @ -24,-24 scale=2 index="a1" ref="dxn:echo:@:01ABC" {
  rect frame 0,0 248x172 "Package A" rotation=45 corners=top color=grey stroke=dashed
  ellipse blob 4,4 20x10 fill=pattern
  diamond gate 0,0 30x30
  triangle warn 0,0 30x30 weight=xl
  circle dot 10,10 4 "o" color=red
  line path 0,0 10,10 20,0 closed=true stroke=dotted
  curve wave 0,0 10,10 20,0
  arc smile 50,50 20 0..180
  text note 4,4 "A label" w=120 weight=s
  arrow bound A/box -> B/box#left "extends" head=triangle tail=circle
  arrow free 10,20 -> 30,40
  arrow half A/box -> _
  portal inner 0,0 240x160 "Inner" ref="dxn:echo:@:01XYZ"
}
`;

const COMMANDS = `object A @ 0,0 {
  rect box 0,0 100x50 "A"
}

elements A {
  rect extra 0,0 5x5
}

move A @ 10,20

remove elements A extra

remove object A
`;

/** Ids the grammar reserves or cannot lex bare; the printer has to quote them back. */
const AWKWARD_IDS = `object "1st" @ 0,0 {
  rect "rect" 0,0 10x10 "quote \\" and \\\\ and \\n"
  rect "has space" 0,0 10x10
}
`;

const NEGATIVES = `object neg @ -1.5,-2 scale=0.25 {
  rect box -10,-20 -30x-40
  arc back 0,0 5 -90..270
}
`;

const roundTrip = (source: string) => printCommands(parse(source).commands);

describe('dsl round trip', () => {
  for (const [name, source] of Object.entries({ KITCHEN_SINK, COMMANDS, AWKWARD_IDS, NEGATIVES })) {
    test(`print(parse(x)) === x — ${name}`, ({ expect }) => {
      expect(parse(source).problems).toEqual([]);
      expect(roundTrip(source)).toEqual(source);
    });
  }

  test('an empty document is empty', ({ expect }) => {
    expect(roundTrip('')).toEqual('');
    expect(roundTrip('# just a comment\n')).toEqual('');
  });

  test('comments parse and are dropped, as documented', ({ expect }) => {
    const { commands, problems } = parse(`
      # leading
      object A @ 0,0 {   # trailing
        rect box 0,0 10x10
      }
    `);
    expect(problems).toEqual([]);
    expect(print(toScene(commands))).toEqual('object A @ 0,0 {\n  rect box 0,0 10x10\n}\n');
  });

  test('a fraction says a value a decimal cannot', ({ expect }) => {
    // A layout that divides a run of 772 by three produces 230.66666666666666, which is not that number: printing
    // it loses the quotient, and the text no longer says what the drawing means. The fraction is read back exactly.
    const source = 'object A @ 0,0 {\n  rect box 0,0 300x692/3 "Third"\n}\n';
    const { commands, problems } = parse(source);
    expect(problems).toEqual([]);
    const [element] = toScene(commands).objects[0].elements;
    expect(element.kind === 'rect' && element.h).toBeCloseTo(692 / 3, 12);
    // Printing normalizes to a decimal: the grammar accepts a fraction so it can be written, but emitting one
    // would produce text an older parser rejects, and the DSL has no version to negotiate that on.
    expect(roundTrip(source)).toEqual('object A @ 0,0 {\n  rect box 0,0 300x230.66666666666666 "Third"\n}\n');
  });

  test('a value a decimal says exactly stays a decimal', ({ expect }) => {
    // Only the repeating values are worth a fraction: binary holds a half and a quarter, so printing them as `1/2`
    // would churn every ordinary coordinate for nothing.
    const source = 'object A @ 0,0 {\n  rect box 0,0 10.5x20.25\n}\n';
    expect(parse(source).problems).toEqual([]);
    expect(roundTrip(source)).toEqual(source);
  });

  test('an arrow states its own bends, so a routed connector can be written down', ({ expect }) => {
    // A connector routed by hand or by a layout kept its bends on the record alone. Printing the drawing lost them
    // and the connector snapped back to a straight run between its ends.
    const source = 'object A @ 0,0 {\n  arrow link a -> b via 10,20 30,20 head=triangle\n}\n';
    const { commands, problems } = parse(source);
    expect(problems).toEqual([]);
    const [element] = toScene(commands).objects[0].elements;
    expect(element.kind === 'arrow' && element.route).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 20 },
    ]);
    expect(roundTrip(source)).toEqual(source);
  });

  test('an arrow routes through points, not grid cells or half a coordinate', ({ expect }) => {
    // A semantic edge's waypoint may pin one coordinate or name a cell, because an engine routes it; an arrow says
    // where its route actually runs, so neither has a meaning and both are reported rather than half-read.
    expect(parse('object A @ 0,0 {\n  arrow link a -> b via cell(1,2)\n}\n').problems).toHaveLength(1);
    expect(parse('object A @ 0,0 {\n  arrow link a -> b via 10,_\n}\n').problems).toHaveLength(1);
  });

  test("a kind's field escapes a name the element already claims", ({ expect }) => {
    // `substrate` keeps a numeric `fill` and `fill` is also the style attribute, so without an escape the reader
    // resolves it against `none|solid|pattern|tint` and rejects the value. The prefix escapes itself, so a field
    // genuinely called `data-fill` is written `data-data-fill` and still reads back as its own name.
    // The element's own attributes print first, then the kind's, each by name: the order is what makes the text
    // stable, not the order the fields happened to be written in.
    const source =
      'object A @ 0,0 {\n  rect box 0,0 10x10 kind=substrate fill=solid data-data-fill=on data-fill=0.55\n}\n';
    const { commands, problems } = parse(source);
    expect(problems).toEqual([]);
    const [element] = toScene(commands).objects[0].elements;
    expect(element.kind === 'rect' && [element.type, element.fill, element.data]).toEqual([
      'substrate',
      'solid',
      { 'fill': 0.55, 'data-fill': 'on' },
    ]);
    expect(roundTrip(source)).toEqual(source);
  });

  test("a kind's field escapes a reserved name, and one the DSL cannot spell is left out", ({ expect }) => {
    // `text` is an element keyword, so `text=hello` is not an attribute the grammar can read; `font.size` is not a
    // name token at all, and a prefix leaves it just as unparseable, so it goes the way a list does.
    const printed = print({
      objects: [
        {
          id: 'A',
          origin: { x: 0, y: 0 },
          scale: 1,
          elements: [
            {
              kind: 'rect',
              id: 'box',
              x: 0,
              y: 0,
              w: 10,
              h: 10,
              type: 'card',
              data: { 'text': 'hello', 'font.size': 12, 'half': 1 / 2 },
            },
          ],
        },
      ],
    });
    expect(printed).toContain('data-text=hello');
    expect(printed).not.toContain('font.size');
    expect(parse(printed).problems).toEqual([]);
    const [element] = toScene(parse(printed).commands).objects[0].elements;
    expect(element.kind === 'rect' && element.data).toEqual({ text: 'hello', half: 0.5 });
  });

  test('a grid holds what it places, in braces', ({ expect }) => {
    // Containment is structural in the text and `parent` in the model: nesting is the spelling, not a second
    // shape. A child written inside the braces drops the attribute, since saying it twice lets the two disagree.
    const source = [
      'object A @ 0,0 {',
      '  grid root 0,0 900x300 cols=3 gap=24 {',
      '    rect a "One"',
      '    rect b "Two"',
      '  }',
      '}',
      '',
    ].join('\n');
    const { commands, problems } = parse(source);
    expect(problems).toEqual([]);
    const [grid, a, b] = toScene(commands).objects[0].elements;
    expect(grid.kind).toEqual('grid');
    expect([a.id, 'parent' in a && a.parent]).toEqual(['a', 'root']);
    expect([b.id, 'parent' in b && b.parent]).toEqual(['b', 'root']);
    expect(roundTrip(source)).toEqual(source);
  });

  test('a grid states its cell size and where the run sits, and reads them back', ({ expect }) => {
    // The two rules a column of cards needs beside its children: one row height whatever the count, and the space
    // left over put either side of them.
    const source = [
      'object A @ 0,0 {',
      '  grid root 0,0 300x900 gap=16 autoRows=176 alignContent=center {',
      '    rect a "One"',
      '  }',
      '}',
      '',
    ].join('\n');
    const { commands, problems } = parse(source);
    expect(problems).toEqual([]);
    const [grid] = toScene(commands).objects[0].elements;
    expect(grid.kind === 'grid' && [grid.autoRows, grid.alignContent]).toEqual([176, 'center']);
    expect(roundTrip(source)).toEqual(source);
  });

  test('a flat `parent` is read, and printed back as nesting', ({ expect }) => {
    // Accepting both costs nothing and a program patching one attribute to reparent a box is a real use; there is
    // still only ONE canonical output, which is what the round trip is proved against.
    const flat = 'object A @ 0,0 {\n  grid root 0,0 900x300 cols=2\n  rect a 0,0 0x0 parent=root\n}\n';
    expect(roundTrip(flat)).toEqual('object A @ 0,0 {\n  grid root 0,0 900x300 cols=2 {\n    rect a\n  }\n}\n');
  });

  test('whitespace is insignificant', ({ expect }) => {
    const dense = 'object A @ 0,0 {rect box 0,0 10x10 "hi" color=red}';
    const loose = 'object   A\n  @ 0 , 0\n{\n  rect\n    box\n    0,0\n    10x10\n    "hi"\n    color=red\n}\n';
    expect(roundTrip(dense)).toEqual(roundTrip(loose));
  });
});

describe('dsl scene mapping', () => {
  test('bound arrow ends survive, with ports', ({ expect }) => {
    const { scene } = parseScene('object e @ 0,0 {\n  arrow a A/box#left -> B/box\n}\n');
    const [arrow] = scene.objects[0].elements;
    expect(arrow).toEqual({ kind: 'arrow', id: 'a', from: 'A/box#left', to: 'B/box' });
  });

  test('an unbound end is absent, not a point', ({ expect }) => {
    const { scene } = parseScene('object e @ 0,0 {\n  arrow a _ -> 1,2\n}\n');
    expect(scene.objects[0].elements[0]).toEqual({ kind: 'arrow', id: 'a', end: { x: 1, y: 2 } });
  });

  test('a portal carries its target', ({ expect }) => {
    const { scene } = parseScene('object p @ 0,0 {\n  portal win 0,0 10x10 "T" ref="dxn:echo:@:01"\n}\n');
    expect(scene.objects[0].elements[0]).toEqual({
      kind: 'portal',
      id: 'win',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      ref: 'dxn:echo:@:01',
      text: 'T',
    });
  });

  test('omitting @ leaves the object where it is', ({ expect }) => {
    const { scene } = parseScene('object A {\n  rect box 0,0 10x10\n}\n');
    expect(scene.objects[0].origin).toBeUndefined();
  });

  test('commands apply in order', ({ expect }) => {
    const { scene } = parseScene(COMMANDS);
    expect(scene.objects).toEqual([]);
  });

  test('upsert-elements replaces by id and keeps the rest', ({ expect }) => {
    const { scene } = parseScene(
      'object A @ 0,0 {\n  rect a 0,0 1x1\n  rect b 0,0 1x1\n}\n\nelements A {\n  rect b 5,5 2x2\n}\n',
    );
    expect(scene.objects[0].elements.map((element) => element.id)).toEqual(['a', 'b']);
    expect(scene.objects[0].elements[1]).toMatchObject({ x: 5, y: 5, w: 2, h: 2 });
  });
});

describe('dsl diagnostics', () => {
  test('an unknown attribute is reported, not fatal', ({ expect }) => {
    const { commands, problems } = parse('object A @ 0,0 {\n  rect box 0,0 10x10 colour=red\n}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('Unknown attribute "colour"');
    expect(commands).toHaveLength(1);
  });

  test('a value outside the schema literals is reported', ({ expect }) => {
    const { problems } = parse('object A @ 0,0 {\n  rect box 0,0 10x10 color=puce\n}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('"color" takes one of');
  });

  test('a portal without a ref is reported', ({ expect }) => {
    const { problems } = parse('object A @ 0,0 {\n  portal p 0,0 10x10\n}\n');
    expect(problems.map(({ message }) => message)).toContain(
      'portal "p" needs ref="<dxn>": it is the drawing shown inside the frame.',
    );
  });

  test('ranges point at the statement and the element a layout report names', ({ expect }) => {
    const source = 'object A @ 0,0 {\n  rect box 0,0 10x10\n}\n';
    const { ranges } = parse(source);
    expect(source.slice(ranges.get('A')!.from, ranges.get('A')!.to)).toEqual(
      'object A @ 0,0 {\n  rect box 0,0 10x10\n}',
    );
    expect(source.slice(ranges.get('A/box')!.from, ranges.get('A/box')!.to)).toEqual('rect box 0,0 10x10');
  });

  //
  // Recovered nodes can hold one number where the grammar wants two. Every one of these threw a
  // TypeError out of `parse` before the readers were guarded, which would have broken the promise
  // that `parse` reports rather than throws.
  //
  for (const [name, source] of Object.entries({
    'half a point': 'object A @ 0, {\n  rect b 0,0 1x1\n}\n',
    'half an element point': 'object A @ 0,0 {\n  rect b 0, 1x1\n}\n',
    'half a range': 'object A @ 0,0 {\n  arc a 0,0 5 90..\n}\n',
    'half a move': 'move A @ 1,\n',
    'half a line point': 'object A @ 0,0 {\n  line l 0,0 10,\n}\n',
  })) {
    test(`an incomplete ${name} reports instead of throwing`, ({ expect }) => {
      const { problems } = parse(source);
      expect(problems.length).toBeGreaterThan(0);
    });
  }

  test('a syntax error is located', ({ expect }) => {
    // A box with a point and no size: legal to the grammar now, and reported because nothing can give it one.
    const { problems } = parse('object A @ 0,0 {\n  rect box 0,0\n}\n');
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].to).toBeGreaterThan(problems[0].from);
  });
});

describe('dsl round-trip hazards', () => {
  test('an upsert without @ keeps the position the object already had', ({ expect }) => {
    const { scene } = parseScene('object A @ 10,20 {\n  rect b 0,0 1x1\n}\n\nobject A {\n  rect b 0,0 2x2\n}\n');
    // `WorldObject.origin` says "omit on upsert to keep the current position".
    expect(scene.objects[0].origin).toEqual({ x: 10, y: 20 });
    expect(scene.objects[0].elements[0]).toMatchObject({ w: 2, h: 2 });
  });

  test('a ref whose id cannot lex bare round-trips quoted', ({ expect }) => {
    // Mermaid ids may start with a digit, so `1st/box` is reachable from a real dialect.
    const scene: Scene.Scene = {
      objects: [{ id: 'edges', origin: { x: 0, y: 0 }, elements: [{ kind: 'arrow', id: 'e', from: '1st/box' }] }],
    };
    const text = print(scene);
    expect(text).toContain('"1st/box"');
    expect(parse(text).problems).toEqual([]);
    expect(toScene(parse(text).commands)).toEqual(scene);
  });

  test('exponent notation survives the round trip', ({ expect }) => {
    // `String(1e-7)` is "1e-7", which the grammar had to learn to read back.
    const scene: Scene.Scene = {
      objects: [
        { id: 'A', origin: { x: 1e-7, y: 1e21 }, elements: [{ kind: 'rect', id: 'b', x: 0, y: 0, w: 1, h: 1 }] },
      ],
    };
    const text = print(scene);
    expect(parse(text).problems).toEqual([]);
    expect(toScene(parse(text).commands)).toEqual(scene);
  });

  //
  // The exponent support the printer needs also admits `1e309`, which `parseFloat` turns into
  // Infinity — an infinite coordinate poisons layout and cannot be printed back, so `parse` must
  // refuse what `print` refuses.
  //
  for (const [name, source] of Object.entries({
    origin: 'object A @ 1e309,0 {\n  rect b 0,0 1x1\n}\n',
    size: 'object A @ 0,0 {\n  rect b 0,0 1e309x1\n}\n',
    radius: 'object A @ 0,0 {\n  circle c 0,0 1e309\n}\n',
    range: 'object A @ 0,0 {\n  arc a 0,0 5 0..1e309\n}\n',
    attribute: 'object A @ 0,0 {\n  rect b 0,0 1x1 rotation=1e309\n}\n',
  })) {
    test(`an overflowing ${name} is reported, not silently Infinity`, ({ expect }) => {
      const { commands, problems } = parse(source);
      expect(problems.length).toBeGreaterThan(0);
      // Nothing infinite may reach a command, since `Draw` would apply it and `print` could not
      // write it back.
      expect(JSON.stringify(commands)).not.toContain('null');
    });
  }

  test('a non-finite coordinate is refused rather than printed unreadably', ({ expect }) => {
    const scene: Scene.Scene = {
      objects: [{ id: 'A', origin: { x: Number.NaN, y: 0 }, elements: [] }],
    };
    expect(() => print(scene)).toThrow(TypeError);
  });
});

describe('dsl over the reference fixture', () => {
  test('BASIC survives a mermaid compile, a print, and a reparse', async ({ expect }) => {
    const commands = await MermaidEngine.compile(BASIC.trim());
    const upserts = commands.filter((command) => command.op === 'upsert-object');
    expect(upserts).toHaveLength(commands.length);

    const text = printCommands(commands);
    const { commands: reparsed, problems } = parse(text);
    expect(problems).toEqual([]);

    // Text identity: the printed form is canonical, so a second pass changes nothing.
    expect(printCommands(reparsed)).toEqual(text);
    // Scene identity: the model survives the text, not merely its formatting.
    expect(toScene(reparsed)).toEqual(toScene(commands));
  });

  test('BASIC prints objects a reviewer can read', async ({ expect }) => {
    const text = printCommands(await MermaidEngine.compile(BASIC.trim()));
    // The frames, the type boxes, and the one `edges` object holding the routes.
    expect(text).toMatch(/^object pkgA @ /m);
    expect(text).toMatch(/^ {2}rect frame 0,0 \d/m);
    expect(text).toMatch(/^object edges @ /m);
    expect(text).toMatch(/ -> /);
  });
});

describe('dsl scene printing', () => {
  test('print emits only object statements', ({ expect }) => {
    const scene: Scene.Scene = {
      objects: [{ id: 'A', origin: { x: 1, y: 2 }, elements: [{ kind: 'rect', id: 'box', x: 0, y: 0, w: 3, h: 4 }] }],
    };
    expect(print(scene)).toEqual('object A @ 1,2 {\n  rect box 0,0 3x4\n}\n');
    expect(toScene(parse(print(scene)).commands)).toEqual(scene);
  });
});
