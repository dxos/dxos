//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Shape } from '@dxos/scene';

import { HEADING, bodyId, headingId, innerId } from '../grid-engine.ts';
import type * as Scene from '../scene.ts';
import { printIntent } from './intent.ts';
import { parse } from './parse.ts';

/** The one object a document of intent or of boxes draws. */
const objectOf = (text: string): Scene.WorldObject => {
  const { commands, problems } = parse(text);
  const [command] = commands;
  if (
    problems.some(({ severity }) => severity === 'error') ||
    commands.length !== 1 ||
    command.op !== 'upsert-object'
  ) {
    throw new Error(`Not one object: ${problems.map(({ message }) => message).join(' · ')}`);
  }
  return command.object;
};

const intentOf = (object: Scene.WorldObject) => printIntent({ objects: [object] });

/** Every construct a grid diagram has, each written the way an author would. */
const SOURCES: Record<string, string> = {
  'tracks and plain boxes': 'diagram kind=grid @ 10,20 size=900x300 cols=3 gap=24 padding=24\nnode a "One"\nnode b\n',
  'labelled and unlabelled groups': `
    diagram kind=grid size=800x600
    group services "Services" gap=12 { node api "API" }
    group plain cols=2 padding=8 { node left "L" }
  `,
  'nesting, order and an empty group': `
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
  `,
  'components and their fields': `
    diagram kind=grid size=800x600
    node field kind=substrate seed=29 data-fill=0.55 hue=neutral live=true note="true" count="12"
    node card "Calendar" kind=card icon=calendar-blank stroke=dashed fill=tint color=blue shape=ellipse
  `,
  'track sizes, placement and frames': `
    diagram kind=grid size=800x600 alignContent=center justifyContent=end autoRows=120
    group cards "Cards" autoRows=88 gap=12 alignContent=center border=true stroke=dashed { node a }
    group wide autoCols=384 fill=tint color=red { node b }
  `,
  'packing and node borders': `
    diagram kind=grid size=800x600
    group field layout=pack packSeed=29 packMin=36 packMax=185 gap=10 {
      node s0 kind=space-graph border=true seed=29 tones="violet | green"
      node s1 kind=space-graph border=false
    }
    group frame cols=2 { node left "L" }
    edge s0#e3 -- frame#w2 path=line
  `,
  'edges': `
    diagram kind=grid size=800x600 cols="1fr 0"
    group side { node a }
    node frame kind=app-frame
    group port { }
    edge a -> frame "reads" head=triangle
    edge a -- frame/nav stroke=dashed path=line
    edge frame#left extends side
    edge a -> port tail=circle color=green
  `,
};

describe('printIntent', () => {
  describe.each(Object.entries(SOURCES))('%s', (_name, source) => {
    test('the text it prints lowers to the same object, element for element', ({ expect }) => {
      const object = objectOf(source);
      const { text, reasons } = intentOf(object);
      expect(reasons).toBeUndefined();
      expect(objectOf(text ?? '')).toEqual(object);
    });

    test('printing is stable: the text of its own text is the same text', ({ expect }) => {
      const { text } = intentOf(objectOf(source));
      expect(intentOf(objectOf(text ?? '')).text).toBe(text);
    });
  });

  test('the text is what an author would write', ({ expect }) => {
    expect(intentOf(objectOf(SOURCES['edges'])).text).toBe(
      [
        'diagram kind=grid size=800x600 cols="1fr 0"',
        '',
        'group side {',
        '  node a',
        '}',
        '',
        'node frame kind=app-frame',
        '',
        'group port { }',
        '',
        'edge a -> frame "reads" head=triangle',
        'edge a -- frame/nav path=line stroke=dashed',
        'edge frame#left extends side',
        'edge a -> port tail=circle color=green',
        '',
      ].join('\n'),
    );
  });

  test('boxes written by hand, under other names, come back as text that draws the same', ({ expect }) => {
    const object = objectOf(`
      object slide @ 0,0 {
        grid page 0,0 800x600 cols=2 gap=16 {
          grid left rows="${HEADING.height} 1fr" gap=${HEADING.gap} {
            rect title-left "Left" fill=none border=false align=center valign=middle fontSize=${HEADING.fontSize}
            grid stack gap=8 {
              rect a "A" kind=card icon=x
              rect gap-1 fill=none border=false
            }
          }
          grid right rows="${HEADING.height} 1fr" gap=${HEADING.gap} padding=24 border=true {
            rect title-right "Right" fill=none border=false align=center valign=middle fontSize=${HEADING.fontSize}
            grid list { rect b "B" }
          }
        }
        arrow link a -> b head=none
      }
    `);
    const { text, reasons } = intentOf(object);
    expect(reasons).toBeUndefined();
    expect(text).toBe(
      [
        'diagram kind=grid size=800x600 cols=2 gap=16',
        '',
        'group left "Left" gap=8 {',
        '  node a "A" kind=card icon=x',
        '  group gap-1 { }',
        '}',
        '',
        // The heading's grid is also padded and framed, which is two groups: the frame, round the labelled one.
        'group right padding=24 border=true {',
        `  group ${innerId('right')} "Right" {`,
        '    node b "B"',
        '  }',
        '}',
        '',
        'edge a -- b',
        '',
      ].join('\n'),
    );
    // The grids are the document's own: the heading and the members' grid take the engine's ids.
    const ids = objectOf(text ?? '').elements.map(({ id }) => id);
    expect(ids).toContain(headingId('left'));
    expect(ids).toContain(bodyId(innerId('right')));
    expect(ids).not.toContain('stack');
  });

  describe('a drawing a grid diagram cannot say is refused, with the reason', () => {
    const root: Shape.Element = { kind: 'grid', id: 'root', x: 0, y: 0, w: 400, h: 200, cols: 2 };
    const box = (id: string, extra: Partial<Shape.Box> = {}): Shape.Element => ({
      kind: 'rect',
      id,
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      text: id,
      parent: 'root',
      ...extra,
    });
    const refused = (elements: Shape.Element[], object: Partial<Scene.WorldObject> = {}) =>
      intentOf({ id: 'slide', elements, ...object });

    test('text style on a box', ({ expect }) => {
      expect(refused([root, box('a', { fontSize: 20, align: 'center' })])).toEqual({
        reasons: ['"a" differs in: align, fontSize.'],
      });
    });

    test('a connector someone routed', ({ expect }) => {
      const route = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];
      expect(refused([root, box('a'), box('b'), { kind: 'arrow', id: 'link', from: 'a', to: 'b', route }])).toEqual({
        reasons: ['The connector a to b differs in: route.'],
      });
    });

    test('a connector with a free end', ({ expect }) => {
      const end = { x: 300, y: 300 };
      expect(refused([root, box('a'), { kind: 'arrow', id: 'link', from: 'a', end }]).reasons).toEqual([
        '1 connector(s) are drawn and 0 can be said.',
      ]);
    });

    test('a box no grid places, a shape that is not a box, a scale, a second object', ({ expect }) => {
      expect(refused([root, box('a'), box('free', { parent: undefined, x: 500, w: 50, h: 50 })]).reasons).toEqual([
        'No single grid holds the drawing.',
      ]);
      expect(refused([root, box('a'), { kind: 'text', id: 'note', x: 0, y: 0, text: 'hi' }]).reasons).toEqual([
        '1 element(s) are neither a box nor a connector.',
      ]);
      expect(refused([root, box('a')], { scale: 2 }).reasons).toEqual([
        'The object is scaled by 2; a grid diagram draws at 1.',
      ]);
      expect(printIntent({ objects: [] }).reasons).toEqual(['A grid diagram is one object; the drawing holds 0.']);
    });

    test('a box whose own size an `auto` track measures', ({ expect }) => {
      const sized = [{ ...root, cols: 'auto 1fr' }, box('a', { w: 120 }), box('b')];
      expect(refused(sized).reasons).toEqual(['"a" differs in: frame.', '"b" differs in: frame.']);
    });

    test('a frame on the outermost grid', ({ expect }) => {
      expect(refused([{ ...root, border: true }, box('a')]).reasons).toEqual(['A frame drawn round a group differs.']);
    });
  });
});
