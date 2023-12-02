//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, type FC } from 'react';

import { Document as DocumentType, Grid as GridType } from '@braneframe/types';
import { Surface, parseMetadataResolverPlugin, useResolvePlugin } from '@dxos/app-framework';
import { getSpaceForObject, isTypedObject, type TypedObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import type { MosaicDropEvent, MosaicOperation, MosaicTileAction, MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { Grid, type GridDataItem } from './Grid';
import type { Position } from './layout';

// TODO(wittjosiah): Factor out to theme.
export const colors: Record<string, string> = {
  gray: '!bg-neutral-50',
  red: '!bg-rose-50',
  indigo: '!bg-indigo-50',
  yellow: '!bg-orange-50',
  green: '!bg-teal-50',
  blue: '!bg-cyan-50',
  // gray: '!bg-neutral-50 border-neutral-200 border shadow-none',
  // red: '!bg-rose-50 border-rose-200 border shadow-none',
  // indigo: '!bg-indigo-50 border-indigo-200 border shadow-none',
  // yellow: '!bg-yellow-50 border-yellow-200 border shadow-none',
  // green: '!bg-teal-50 border-teal-200 border shadow-none',
  // blue: '!bg-cyan-50 border-cyan-200 border shadow-none',
};

// TODO(burdon): Need lenses (which should be normalized outside of card).
export const getObject = (item: any): TypedObject => item.node?.data ?? item.object ?? item;

export const GridMain: FC<{ grid: GridType }> = ({ grid }) => {
  const space = getSpaceForObject(grid);
  const metadataPlugin = useResolvePlugin(parseMetadataResolverPlugin);

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
    const gridItem = active.item as GridType.Item;
    if (grid.items.includes(gridItem) && over.position) {
      gridItem.position = over.position;
    } else {
      const parseData = metadataPlugin?.provides.metadata.resolver(active.type)?.parse;
      const object = parseData ? parseData(active.item, 'object') : undefined;
      isTypedObject(object) && grid.items.push(new GridType.Item({ object, position: over.position }));
    }
  };

  const handleCreate = (position: Position) => {
    grid.items.push(new GridType.Item({ object: new DocumentType(), position }));
  };

  // TODO(burdon): Accessor to get card values.
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <Grid
        id='grid' // TODO(burdon): Namespace.
        // TODO(wittjosiah): Cast is needed because subtypes are currently always optional.
        items={grid.items as GridDataItem[]}
        type={GridType.Item.schema.typename}
        onAction={handleAction}
        onCreate={handleCreate}
        onDrop={handleDrop}
        onOver={handleOver}
        Component={GridCard}
      />
    </Main.Content>
  );
};

const GridCard: MosaicTileComponent<GridDataItem> = forwardRef(({ item, ...props }, forwardRef) => {
  const metadataPlugin = useResolvePlugin(parseMetadataResolverPlugin);
  const parseData = props.type && metadataPlugin?.provides.metadata.resolver(props.type)?.parse;
  const content = parseData ? parseData(item, 'view-object') : item;

  return <Surface role='card' ref={forwardRef} limit={1} data={{ content }} {...props} />;
});
