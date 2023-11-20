//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect } from 'react';

import { Document as DocumentType, Grid as GridType } from '@braneframe/types';
import { Expando, getSpaceForObject, type TypedObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  Grid,
  type MosaicDropEvent,
  type MosaicOperation,
  type MosaicTileAction,
  type Position,
} from '@dxos/react-ui-mosaic';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { colors, getObject, GridCard } from './GridCard';

export const GridMain: FC<{ grid: GridType }> = ({ grid }) => {
  const space = getSpaceForObject(grid);

  useEffect(() => {
    if (!grid.layout) {
      // TODO(burdon): Support expando values in protobuf.
      grid.layout = new Expando({ position: {} });
    }
  }, []);

  if (!space) {
    return null;
  }

  const handleAction = ({ id, action }: MosaicTileAction) => {
    switch (action) {
      case 'delete': {
        const idx = grid.items.findIndex((item) => item.id === id);
        if (idx !== -1) {
          const [item] = grid.items.splice(idx, 1);
          space.db.remove(item);
        }
        break;
      }
      case 'set-color': {
        const item = grid.items.find((item) => item.id === id);
        if (item) {
          item.color = Object.keys(colors)[Math.floor(Math.random() * Object.keys(colors).length)];
        }
      }
    }
  };

  const handleOver = (): MosaicOperation => 'copy';

  const handleDrop = ({ active, over }: MosaicDropEvent<Position>) => {
    if (grid.items.includes(active.item as any)) {
      grid.layout.position[active.item.id] = over.position;
    } else {
      const object: TypedObject = getObject(active.item);
      const item = new GridType.Item({ object });

      grid.items.push(item);
      grid.layout.position[item.id] = over.position;
    }
  };

  const handleCreate = (position: Position) => {
    const item = new GridType.Item({ object: new DocumentType() });
    grid.layout.position[item.id] = position;
    grid.items.push(item);
  };

  // TODO(burdon): Accessor to get card values.
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <Grid
        id='grid' // TODO(burdon): Namespace.
        items={grid.items}
        layout={grid.layout?.position}
        onAction={handleAction}
        onCreate={handleCreate}
        onDrop={handleDrop}
        onOver={handleOver}
        Component={GridCard}
      />
    </Main.Content>
  );
};
