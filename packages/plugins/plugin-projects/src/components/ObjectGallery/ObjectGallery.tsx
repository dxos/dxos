//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { memo, useMemo } from 'react';

import { Obj, type Ref } from '@dxos/echo';
import { Masonry } from '@dxos/react-ui-masonry';

import { ObjectCard } from '../ObjectCard/index.ts';

/** Column width for compact cards in rem: narrow enough for two across a companion pane. */
const COMPACT_COLUMN_WIDTH = 12;

type ObjectTileData = { object: Obj.Unknown; compact?: boolean; onClick: () => void; onDelete?: () => void };

export type ObjectGalleryProps = {
  refs: ReadonlyArray<Ref.Ref<Obj.Unknown>>;
  /** Header-only mini cards in narrow columns. */
  compact?: boolean;
  /**
   * Whether the gallery owns scrolling. Off when an ancestor already scrolls (e.g. a form's viewport):
   * nested, the inner scroll root shrink-wraps to its scrollbar gutter and the grid measures zero.
   */
  scroll?: boolean;
  onOpen: (object: Obj.Unknown) => void;
  onDelete?: (object: Obj.Unknown) => void;
};

/**
 * Linked objects (a project's or a task's artifacts) as clickable cards. Unresolved refs are omitted
 * until their target loads.
 */
export const ObjectGallery = ({ refs, compact, scroll = false, onOpen, onDelete }: ObjectGalleryProps) => {
  // Resolve reactively: on a cold load the targets are not yet in memory, and reading `.target`
  // synchronously would leave the gallery permanently empty (refs read off a snapshot carry no
  // resolver). `ref.atom` tracks loading without tracking mutations — a rename re-renders just its
  // card, since `ObjectCard` subscribes itself.
  const objectsAtom = useMemo(
    () => Atom.make((get) => refs.map((ref) => get(ref.atom)).filter((object): object is Obj.Unknown => !!object)),
    [refs],
  );
  const objects = useAtomValue(objectsAtom);
  const items = useMemo<ObjectTileData[]>(
    () =>
      objects.map((object) => ({
        object,
        compact,
        onClick: () => onOpen(object),
        onDelete: onDelete && (() => onDelete(object)),
      })),
    [objects, compact, onOpen, onDelete],
  );

  if (items.length === 0) {
    return null;
  }

  const viewport = <Masonry.Viewport items={items} getId={(data) => Obj.getURI(data.object)} scroll={scroll} />;
  return (
    <Masonry.Root
      Tile={ObjectTile}
      centered={false}
      {...(compact && { minColumnWidth: COMPACT_COLUMN_WIDTH, gap: 0.5 })}
    >
      {scroll ? <Masonry.Content>{viewport}</Masonry.Content> : viewport}
    </Masonry.Root>
  );
};

const ObjectTile = memo(({ data }: { data: ObjectTileData | undefined; index: number }) =>
  data ? (
    <ObjectCard object={data.object} compact={data.compact} onClick={data.onClick} onDelete={data.onDelete} />
  ) : null,
);

ObjectTile.displayName = 'ObjectTile';
