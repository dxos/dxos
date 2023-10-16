//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect } from 'react';

import type { SpacePluginProvides } from '@braneframe/plugin-space';
import { Document as DocumentType, type Grid as GridType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import type { MosaicDropEvent } from '@dxos/aurora-grid/dist/types/src/mosaic';
import { Grid, type Position } from '@dxos/aurora-grid/next';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { Expando } from '@dxos/client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

import { GridCard } from './GridCard';

export const GridMain: FC<{ data: GridType }> = ({ data: grid }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;

  // TODO(burdon): Make automatic.
  useEffect(() => {
    if (!grid.layout) {
      grid.layout = new Expando({ position: {} });
    }
  }, []);

  if (!space) {
    return null;
  }

  const handleDrop = ({ active, over }: MosaicDropEvent<Position>) => {
    grid.layout.position[active.item.id] = over.position;
  };

  const handleCreate = (position: Position) => {
    const document = new DocumentType(); // TODO(burdon): Hide from sidebar; or create Card/Note subtype like kanban.
    grid.objects.push(document);
    grid.layout.position[document.id] = position;
  };

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <Grid
        id='test'
        items={grid.objects}
        layout={grid.layout?.position}
        onCreate={handleCreate}
        onDrop={handleDrop}
        Component={GridCard}
      />
    </Main.Content>
  );
};
