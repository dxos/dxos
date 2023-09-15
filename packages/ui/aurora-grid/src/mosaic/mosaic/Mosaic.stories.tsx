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
import { getDndId } from '../dnd';
import type { DelegatorProps, MosaicChangeHandler, MosaicState, MosaicState as MosaicType, StackTile } from '../types';

faker.seed(1234);
const fake = faker.helpers.fake;

const rearrangeMosaicId = faker.string.uuid();
const rearrangeTiles = [...Array(10)].reduce((acc: MosaicType['tiles'], _, index) => {
  const id = getDndId(rearrangeMosaicId, faker.string.uuid());
  acc[id] = {
    id,
    index: `a${index}`,
    ...(index === 0 ? { variant: 'stack', sortable: true } : { variant: 'card' }),
  };
  return acc;
}, {});

const rearrangeIds = Object.keys(rearrangeTiles);

type StorybookDataProps = { label: string; description: string };

const data = rearrangeIds.reduce((acc: Record<string, StorybookDataProps>, id) => {
  acc[id] = {
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
  };
  return acc;
}, {});

const RearrangeDelegator = forwardRef<HTMLDivElement, DelegatorProps<StorybookDataProps>>(
  ({ data, tile, dragHandleAttributes, dragHandleListeners, style, children, isActive }, forwardedRef) => {
    const { label, description } = data;
    return tile.variant === 'card' ? (
      <div
        role='group'
        className={mx(
          groupSurface,
          surfaceElevation({ elevation: 'group' }),
          'rounded relative',
          isActive && 'opacity-0',
        )}
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
      <div role='group' className='p-2 space-b-2'>
        {children}
      </div>
    );
  },
);

const rearrangeRootId = rearrangeIds[0];
const rearrangeSectionIds = Object.keys(rearrangeTiles).filter((id) => id !== rearrangeRootId);
const rearrangeMosaicState = {
  tiles: rearrangeTiles,
  relations: {
    [rearrangeRootId]: {
      child: new Set(rearrangeSectionIds),
    },
    ...rearrangeSectionIds.reduce((acc: MosaicType['relations'], id) => {
      acc[id] = { parent: new Set([rearrangeRootId]) };
      return acc;
    }, {}),
  },
};
const rearrangeMosaic = deepSignal<MosaicType>(rearrangeMosaicState);

rearrangeMosaic.$tiles?.subscribe((items) => console.log('[mosaic.stories]', 'items update', Object.keys(items)));

// const onMosaicChange = (event: MosaicChangeEvent) => console.log('[on mosaic change]', event);

type MosaicStoryArgs = {
  mosaic: DeepSignal<MosaicState>;
  root: string;
  onMosaicChange: MosaicChangeHandler;
};

// @ts-ignore
export const Rearrange = {
  args: {},
  render: (rootProps: Pick<MosaicStoryArgs, 'onMosaicChange'>) => {
    return (
      <Mosaic.Root
        {...rootProps}
        mosaic={rearrangeMosaic}
        Delegator={RearrangeDelegator as FC<DelegatorProps>}
        id={rearrangeMosaicId}
      >
        <Mosaic.Tile {...(rearrangeMosaic.tiles[rearrangeRootId] as StackTile)} />
      </Mosaic.Root>
    );
  },
};

// @ts-ignore
export const Copy = {
  args: {},
  render: (rootProps: Pick<MosaicStoryArgs, 'onMosaicChange'>) => {
    return (
      <div className='fixed inset-0 flex gap-4 pli-4'>
        <div className='min-is-0 flex-1 overflow-y-auto'>
          <Mosaic.Root {...rootProps} mosaic={rearrangeMosaic} Delegator={RearrangeDelegator as FC<DelegatorProps>}>
            <Mosaic.Tile {...(rearrangeMosaic.tiles[rearrangeRootId] as StackTile)} />
          </Mosaic.Root>
        </div>
        <div className='min-is-0 flex-1 overflow-y-auto'>
          <Mosaic.Root {...rootProps} mosaic={rearrangeMosaic} Delegator={RearrangeDelegator as FC<DelegatorProps>}>
            <Mosaic.Tile {...(rearrangeMosaic.tiles[rearrangeRootId] as StackTile)} />
          </Mosaic.Root>
        </div>
      </div>
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
