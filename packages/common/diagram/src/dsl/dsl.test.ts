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
