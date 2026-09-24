//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Masonry } from '@dxos/react-ui-masonry';
import { isNonNullable } from '@dxos/util';

import { ObjectCard } from '#components';

export type CardMasonryProps = Pick<AppSurface.CardMasonryData, 'objects'>;

/**
 * Several objects as cards, laid out in as many columns as the host gives it room for.
 *
 * The host hands the grid what belongs in it — a task's artifacts, a record's attachments — so this
 * renders a list it is given rather than deriving one from a subject the way `RelatedArticle` does.
 * Each card is the generic {@link ObjectCard}: label and depiction from the schema's annotations,
 * body from the type's own `CardContent` surface.
 *
 * Masonry rather than a column of full-width cards: the same grid a project's artifacts and a
 * record's related objects already use, so a host that widens (a companion opened as a plank) gains
 * columns instead of stretching every card across the pane. It owns its scrolling through
 * `Masonry.Content`, so a host can bound it without the cards deciding its height.
 */
export const CardMasonry = ({ objects: refs }: CardMasonryProps) => {
  // Resolved reactively rather than through `ref.target`: on a cold load the targets are not in
  // memory yet, and a synchronous read would leave the grid permanently empty. `ref.atom` tracks
  // loading without tracking mutations — a rename re-renders only its card, which subscribes itself.
  const objectsAtom = useMemo(() => Atom.make((get) => refs.map((ref) => get(ref.atom)).filter(isNonNullable)), [refs]);
  const objects = useAtomValue(objectsAtom);

  // Nothing to show is nothing at all, not an empty region: the host decides whether its absence
  // needs saying, and a grid with no cards would otherwise hold open a gap under the content.
  if (objects.length === 0) {
    return null;
  }

  return (
    <Masonry.Root Tile={ObjectCard}>
      <Masonry.Content data-testid='cardMasonry'>
        <Masonry.Viewport items={objects} getId={(object) => Obj.getURI(object).toString()} />
      </Masonry.Content>
    </Masonry.Root>
  );
};

CardMasonry.displayName = 'CardMasonry';
