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

import { feedCardSpec } from './FeedCard.tsx';
import { spaceGraphSpec } from './SpaceGraph.tsx';

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
  test('the card and icon prototypes are registered, and are not types of their own', ({ expect }) => {
    expect(Object.keys(defaultNodePrototypes).sort()).toEqual(['box', 'card', 'icon']);
    expect(registry()['card']).toBeUndefined();
    expect(registry()['icon']).toBeUndefined();
    // A prototype carries a look and an editing model, not a schema: a type brings that.
    expect(cardPrototype.schema).toBeUndefined();
    expect(iconPrototype.schema).toBeUndefined();
  });

  test('the feed card inherits the card prototype and overrides what it draws itself', ({ expect }) => {
    const card = registry()['feed-card'];
    expect(card.name).toEqual('Feed card');
    // Its own: the view (it adds the feed strip), the size, and a part for the strip's caption.
    expect(card.component).toEqual(feedCardSpec.component);
    expect(card.defaultSize).toEqual({ width: 300, height: 138 });
    expect(card.parts?.map(({ field }) => field)).toEqual(['label', 'feedLabel', 'body', 'footer']);
    // Inherited: what the kind no longer restates.
    expect(card.resizable).toEqual(cardPrototype.resizable);
    expect(card.minSize).toEqual(cardPrototype.minSize);
  });

  test('a kind naming no prototype is unaffected', ({ expect }) => {
    const space = registry()['space-graph'];
    expect(space.ellipse).toBe(true);
    expect(space.bare).toBe(true);
    expect(space.minSize).toEqual({ width: 120, height: 120 });
  });
});
