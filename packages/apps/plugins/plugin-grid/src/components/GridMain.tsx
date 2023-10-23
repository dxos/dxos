//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect } from 'react';

import type { SpacePluginProvides } from '@braneframe/plugin-space';
import { Grid as GridType } from '@braneframe/types';
import { findPlugin, usePlugins } from '@dxos/app-framework';
import { Expando } from '@dxos/client/echo';
import { Main } from '@dxos/react-ui';
import { type MosaicTileAction, Grid, type MosaicDropEvent, type Position } from '@dxos/react-ui-mosaic';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { colors, GridCard } from './GridCard';

export const GridMain: FC<{ data: GridType }> = ({ data: grid }) => {
  const { plugins } = usePlugins();

  // TODO(burdon): Get from properties?
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;

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

  const handleDrop = ({ active, over }: MosaicDropEvent<Position>) => {
    if (!grid.items.includes(active.item as any)) {
      grid.items.push(active.item as any);
    }
    grid.layout.position[active.item.id] = over.position;
  };

  const handleCreate = (position: Position) => {
    // const document = new DocumentType();
    const item = new GridType.Item();
    grid.layout.position[item.id] = position;
    grid.items.push(item);
  };

  // TODO(burdon): Accessor to get card values.
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <Grid
        id='grid' // TODO(burdon): Namespace.
        items={grid.items}
        layout={grid.layout?.position}
        onAction={handleAction}
        onCreate={handleCreate}
        onDrop={handleDrop}
        Component={GridCard}
      />
    </Main.Content>
  );
};
