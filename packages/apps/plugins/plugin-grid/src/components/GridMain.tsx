//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect } from 'react';

import type { SpacePluginProvides } from '@braneframe/plugin-space';
import { Grid as GridType } from '@braneframe/types';
import { findPlugin, usePlugins } from '@dxos/app-framework';
import { Expando, type TypedObject } from '@dxos/client/echo';
import { Main } from '@dxos/react-ui';
import {
  type MosaicTileAction,
  Grid,
  type MosaicDropEvent,
  type Position,
  type MosaicOperation,
} from '@dxos/react-ui-mosaic';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { colors, GridCard } from './GridCard';

export const GridMain: FC<{ grid: GridType }> = ({ grid }) => {
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

  const handleOver = (): MosaicOperation => 'copy';

  const handleDrop = ({ active, over }: MosaicDropEvent<Position>) => {
    if (grid.items.includes(active.item as any)) {
      grid.layout.position[active.item.id] = over.position;
    } else {
      // TODO(burdon): Fail if not expando?
      // TODO(burdon): Have to dive into object if SearchResult (need adapter?)
      const object: TypedObject = (active.item as any).object ?? active.item;
      const item = new GridType.Item({ object });

      console.log('###', JSON.stringify(object, undefined, 2));
      console.log('>>>', JSON.stringify(item, undefined, 2));

      grid.items.push(item);
      grid.layout.position[item.id] = over.position;
    }
  };

  const handleCreate = (position: Position) => {
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
        onOver={handleOver}
        Component={GridCard}
      />
    </Main.Content>
  );
};
