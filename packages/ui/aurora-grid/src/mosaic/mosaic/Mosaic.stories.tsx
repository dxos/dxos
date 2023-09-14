//
// Copyright 2023 DXOS.org
//
import '@dxosTheme';
import { faker } from '@faker-js/faker';
import { DotsSixVertical } from '@phosphor-icons/react';
import { DeepSignal, deepSignal } from 'deepsignal';
import React, { FC, forwardRef } from 'react';

import { Button } from '@dxos/aurora';
import { getSize, groupSurface, mx, surfaceElevation } from '@dxos/aurora-theme';

import { Mosaic } from './Mosaic';
import type { DelegatorProps, MosaicChangeHandler, MosaicState, MosaicState as MosaicType, StackTile } from '../types';

faker.seed(1234);
const fake = faker.helpers.fake;

const tiles = [...Array(10)].reduce((acc: MosaicType['tiles'], _, index) => {
  const id = faker.string.uuid();
  acc[id] = {
    id,
    index: `a${index}`,
    ...(index === 0 ? { variant: 'stack', sortable: true } : { variant: 'card' }),
  };
  return acc;
}, {});

const ids = Object.keys(tiles);

type StorybookDataProps = { label: string; description: string };

const data = ids.reduce((acc: Record<string, StorybookDataProps>, id) => {
  acc[id] = {
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
  };
  return acc;
}, {});

const StackDelegator = forwardRef<HTMLDivElement, DelegatorProps<StorybookDataProps>>(
  ({ data, tile, dragHandleAttributes, dragHandleListeners, style, children }, forwardedRef) => {
    const { label, description } = data;
    return tile.variant === 'card' ? (
      <div
        role='group'
        className={mx(groupSurface, surfaceElevation({ elevation: 'group' }), 'rounded m-2 relative')}
        style={style}
        ref={forwardedRef}
      >
        <Button
          variant='ghost'
          classNames='is-full justify-start pli-2 gap-1'
          {...dragHandleAttributes}
          {...dragHandleListeners}
        >
          <DotsSixVertical className={getSize(4)} />
          <h2 className='text-lg font-system-medium'>{label}</h2>
        </Button>
        <p className='pis-7 pie-4 pbe-2'>{description}</p>
      </div>
    ) : (
      <>{children}</>
    );
  },
);

const stackRootId = ids[0];
const stackSectionIds = Object.keys(tiles).filter((id) => id !== stackRootId);
const stackMosaicState = {
  tiles,
  relations: {
    [stackRootId]: {
      child: new Set(stackSectionIds),
    },
    ...stackSectionIds.reduce((acc: MosaicType['relations'], id) => {
      acc[id] = { parent: new Set([stackRootId]) };
      return acc;
    }, {}),
  },
};
console.log('[stack mosaic state]', stackMosaicState);

const stackMosaic = deepSignal<MosaicType>(stackMosaicState);

stackMosaic.$tiles?.subscribe((items) => console.log('[mosaic.stories]', 'items update', Object.keys(items)));

// const onMosaicChange = (event: MosaicChangeEvent) => console.log('[on mosaic change]', event);

type MosaicStoryArgs = {
  mosaic: DeepSignal<MosaicState>;
  root: string;
  Delegator: FC<DelegatorProps>;
  onMosaicChange: MosaicChangeHandler;
};

// @ts-ignore
export const Stack = {
  args: {
    mosaic: stackMosaic,
    root: stackRootId,
    Delegator: StackDelegator,
  },
  render: ({ root: rootTileId, ...rootProps }: MosaicStoryArgs) => {
    return (
      <Mosaic.Root {...rootProps}>
        <Mosaic.Tile {...(rootProps.mosaic.tiles[rootTileId] as StackTile)} />
      </Mosaic.Root>
    );
  },
};

// @ts-ignore
export default {
  component: Mosaic.Root,
  decorators: [
    (Story: any) => {
      return (
        <Mosaic.Provider data={data}>
          <Story />
        </Mosaic.Provider>
      );
    },
  ],
  argTypes: { onMosaicChange: { action: 'mosaic changed' } },
};
