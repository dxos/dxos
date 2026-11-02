//
// Copyright 2026 DXOS.org
//

import React, { memo, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Masonry } from '@dxos/react-ui-masonry';

import { ObjectCard } from '../ObjectCard/index.ts';

type ObjectTileData = { object: Obj.Unknown; onClick: () => void; onDelete?: () => void; testId?: string };

export type ObjectGalleryProps = {
  objects: readonly Obj.Unknown[];
  onOpen: (object: Obj.Unknown) => void;
  /** Adds a delete item to each card's menu. */
  onDelete?: (object: Obj.Unknown) => void;
  /** `data-testid` of each card. */
  testId?: string;
};

/** Objects as a masonry of {@link ObjectCard}s, for a surface whose own viewport scrolls it. */
export const ObjectGallery = ({ objects, onOpen, onDelete, testId }: ObjectGalleryProps) => {
  const items = useMemo<ObjectTileData[]>(
    () =>
      objects.map((object) => ({
        object,
        onClick: () => onOpen(object),
        onDelete: onDelete && (() => onDelete(object)),
        testId,
      })),
    [objects, onOpen, onDelete, testId],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    // No `Masonry.Content`: its `ScrollArea.Root` nested in the host's scrolling viewport shrink-wraps to the
    // scrollbar gutter, and the viewport's `contentWidth > 0` gate then suppresses every tile.
    <Masonry.Root Tile={ObjectTile} centered={false}>
      <Masonry.Viewport items={items} getId={(data) => Obj.getURI(data.object)} scroll={false} />
    </Masonry.Root>
  );
};

const ObjectTile = memo(({ data }: { data: ObjectTileData | undefined; index: number }) =>
  data ? (
    <ObjectCard object={data.object} onClick={data.onClick} onDelete={data.onDelete} data-testid={data.testId} />
  ) : null,
);

ObjectTile.displayName = 'ObjectTile';
