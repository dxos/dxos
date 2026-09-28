//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { createContext, useContext, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Card, Icon } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { isNonNullable } from '@dxos/util';

import { ObjectCard } from '../ObjectCard/index.ts';

/** Scales a `compact` grid's cards to three quarters: enough for two columns in a companion-width host. */
const COMPACT_ZOOM = '[zoom:0.75]';

export type CardMasonryProps = Pick<AppSurface.CardMasonryData, 'objects' | 'size' | 'inline' | 'CardMenu' | 'pending'>;

type Tile = { kind: 'object'; object: Obj.Unknown } | { kind: 'pending'; pending: AppSurface.CardMasonryPending };

/** The masonry fixes a tile's props to its own signature, so the host's card menu reaches tiles this way. */
const CardMenuContext = createContext<AppSurface.CardMasonryData['CardMenu']>(undefined);

/**
 * Several objects as cards, laid out in as many columns as the host gives it room for.
 *
 * The host hands the grid what belongs in it — a task's artifacts, a record's attachments — so this
 * renders a list it is given rather than deriving one from a subject the way `RelatedArticle` does.
 * Each card is the generic {@link ObjectCard}: label and depiction from the schema's annotations,
 * body from the type's own `CardContent` surface, and a menu of the object's actions (open, add to
 * collection) to which the host adds its own through `CardMenu` — removing the object from the host's
 * list, say. A host may also show placeholder cards for objects it is still adding.
 *
 * A `compact` grid zooms rather than transforms: zoom scales the layout box too, so the masonry
 * measures a width a third wider and lays out full-size cards in the columns that fit it — two in a
 * companion — which then paint at three quarters of their size.
 */
export const CardMasonry = ({ objects: refs, size = 'default', inline, CardMenu, pending = [] }: CardMasonryProps) => {
  // Resolved reactively rather than through `ref.target`: on a cold load the targets are not in
  // memory yet, and a synchronous read would leave the grid permanently empty. `ref.atom` tracks
  // loading without tracking mutations — a rename re-renders only its card, which subscribes itself.
  const objectsAtom = useMemo(() => Atom.make((get) => refs.map((ref) => get(ref.atom)).filter(isNonNullable)), [refs]);
  const objects = useAtomValue(objectsAtom);
  const tiles = useMemo<Tile[]>(
    () => [
      ...objects.map((object) => ({ kind: 'object' as const, object })),
      ...pending.map((entry) => ({ kind: 'pending' as const, pending: entry })),
    ],
    [objects, pending],
  );

  // Nothing to show is nothing at all, not an empty region: the host decides whether its absence
  // needs saying, and a grid with no cards would otherwise hold open a gap under the content.
  if (tiles.length === 0) {
    return null;
  }

  const zoom = size === 'compact' ? COMPACT_ZOOM : undefined;
  return (
    <CardMenuContext.Provider value={CardMenu}>
      {/* In flow the grid starts at the host's edge like the rows around it; in its own scroller it
          centres, since nothing beside it sets an edge. */}
      <Masonry.Root Tile={CardMasonryTile} centered={!inline}>
        {inline ? (
          // Zoomed here rather than on the viewport: the viewport measures its own box, so only an
          // ancestor's zoom widens what it measures. In flow, nothing above depends on this height.
          <div className={zoom} data-testid='cardMasonry'>
            <Masonry.Viewport
              items={tiles}
              getId={getTileId}
              scroll={false}
              // The section around the grid already spaces it, so the masonry's own top and bottom
              // gap would double it.
              classNames='-my-3'
            />
          </div>
        ) : (
          <Masonry.Content classNames={zoom} data-testid='cardMasonry'>
            <Masonry.Viewport items={tiles} getId={getTileId} />
          </Masonry.Content>
        )}
      </Masonry.Root>
    </CardMenuContext.Provider>
  );
};

CardMasonry.displayName = 'CardMasonry';

const getTileId = (tile: Tile): string =>
  tile.kind === 'object' ? Obj.getURI(tile.object).toString() : `pending:${tile.pending.id}`;

const CardMasonryTile = ({ data: tile }: { data: Tile }) => {
  const CardMenu = useContext(CardMenuContext);
  return tile.kind === 'pending' ? (
    <PendingCard label={tile.pending.label} />
  ) : (
    <ObjectCard data={tile.object} CardMenu={CardMenu} />
  );
};

/** An object still being added: its header alone, the title saying what is on its way. */
const PendingCard = ({ label }: { label: string }) => (
  <Card.Root data-testid='cardMasonry.pending' aria-busy='true'>
    <Card.Header>
      <Card.Block>
        <Icon icon='ph--spinner-gap--regular' classNames='animate-spin' />
      </Card.Block>
      <Card.Title classNames='truncate text-description'>{label}</Card.Title>
    </Card.Header>
  </Card.Root>
);
