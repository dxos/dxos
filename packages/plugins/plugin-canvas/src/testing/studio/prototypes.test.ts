//
// Copyright 2026 DXOS.org
//

//
// A contributed kind may be built on a core prototype, as a built-in type is. `ElementKindSpec` used to forbid it
// (`Omit<…, 'extends'>`), so a kind that wanted the card's look had to restate it; the test is here because the
// feed card is the first kind to use it.
//

import { describe, test } from 'vitest';

import {
  cardPrototype,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  iconPrototype,
  kindNodeDef,
} from '@dxos/react-ui-canvas';
import { DEFAULT_GRID, MAJOR_GRID_RATIO } from '@dxos/scene';

import { spaceGraphSpec } from '../../components/index.ts';
import { feedCardSpec } from './FeedCard.tsx';

const registry = () =>
  createNodeRegistry(
    {
      ...defaultNodeTypes,
      'feed-card': kindNodeDef('feed-card', feedCardSpec),
      'space-graph': kindNodeDef('space-graph', spaceGraphSpec),
    },
    defaultNodePrototypes,
  );

describe('core prototypes', () => {
  test('the shape prototypes are registered', ({ expect }) => {
    // `object` is the prototype a tool whose shape is a composite extends (the `card` type, a UML class).
    expect(Object.keys(defaultNodePrototypes).sort()).toEqual(['box', 'card', 'icon', 'object']);
    // A prototype carries a look and an editing model, not a schema: a type brings that.
    expect(cardPrototype.schema).toBeUndefined();
    expect(iconPrototype.schema).toBeUndefined();
  });

  test("a type may share its prototype's name", ({ expect }) => {
    // Types and prototypes are different namespaces, so `card` on `card` is inheritance, not a cycle, and the
    // `card` prototype stays for a kind that paints its own view (the feed card below).
    for (const type of ['card', 'icon']) {
      expect(registry()[type].name).toEqual(type === 'card' ? 'Card' : 'Icon');
    }
    expect(registry()['icon'].component).toEqual(iconPrototype.component);
    expect(registry()['icon'].bare).toBe(true);
    expect(registry()['card'].parts?.map(({ field }) => field)).toEqual(['label', 'body', 'footer']);
    // The `card` type itself is a composite object now: it declares a template and draws no view of its own.
    expect(registry()['card'].template).toBeDefined();
  });

  test('every default size is in nominal units, and a whole number of minor ones', ({ expect }) => {
    // One nominal unit is the major grid cell (48px), so a size in the hundreds would drop a shape the size of a
    // screen; and a shape whose default is not a whole number of minor units (12px) lands off the grid it is
    // dropped on, which is `MAJOR_GRID_RATIO` (4) times the nominal unit.
    for (const [type, { defaultSize }] of Object.entries(registry())) {
      for (const length of [defaultSize.width, defaultSize.height]) {
        expect({ type, length, minor: length * MAJOR_GRID_RATIO }).toMatchObject({
          type,
          length: expect.any(Number),
          minor: Math.round(length * MAJOR_GRID_RATIO),
        });
        expect(length).toBeLessThanOrEqual(16);
      }
    }
  });

  test('every minimum size is a whole number of the finest grid level', ({ expect }) => {
    // A shape resized to its floor still has its edges on a line the canvas draws: the quarter cell is the finest
    // level the grid ever shows, so a minimum off it can never be snapped to.
    const finest = DEFAULT_GRID / MAJOR_GRID_RATIO;
    for (const [type, { minSize }] of Object.entries(registry())) {
      for (const length of [minSize?.width, minSize?.height]) {
        expect({ type, off: length === undefined ? 0 : length % finest }).toEqual({ type, off: 0 });
      }
    }
  });

  test('the feed card inherits the card prototype and overrides what it draws itself', ({ expect }) => {
    const card = registry()['feed-card'];
    expect(card.name).toEqual('Feed card');
    // Its own: the view (it adds the feed strip), the size, and a part for the strip's caption.
    expect(card.component).toEqual(feedCardSpec.component);
    expect(card.defaultSize).toEqual({ width: 6, height: 3 });
    expect(card.parts?.map(({ field }) => field)).toEqual(['label', 'data.feedLabel', 'body', 'footer']);
    // Inherited: what the kind no longer restates.
    expect(card.resizable).toEqual(cardPrototype.resizable);
    expect(card.minSize).toEqual(cardPrototype.minSize);
  });

  test('a kind naming no prototype is unaffected', ({ expect }) => {
    const space = registry()['space-graph'];
    expect(space.ellipse).toBe(true);
    expect([space.bare, space.outline]).toEqual([undefined, true]);
    expect(space.minSize).toEqual({ width: 120, height: 120 });
    // A new graph has every setting written out, so the Properties panel shows values rather than empty fields.
    const made = space.create({ id: 's', z: 'a0', center: { x: 0, y: 0 }, size: { width: 384, height: 384 } });
    expect(Reflect.get(made, 'data')).toEqual({ seed: 7, pitch: 26, fill: 0.6, extra: 0.45, size: 24, hue: 'neutral' });
  });
});
