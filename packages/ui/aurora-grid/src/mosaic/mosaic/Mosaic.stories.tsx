//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { DotsSixVertical } from '@phosphor-icons/react';
import { DeepSignal, deepSignal } from 'deepsignal';
import React, { FC, forwardRef } from 'react';

import { Button } from '@dxos/aurora';
import { dropRing, getSize, groupSurface, mx, surfaceElevation } from '@dxos/aurora-theme';

import { Mosaic } from './Mosaic';
import { getDndId, parseDndId } from '../dnd';
import type { DelegatorProps, MosaicChangeHandler, MosaicState, StackTile } from '../types';

faker.seed(1234);
const fake = faker.helpers.fake;

type MosaicStoryArgs = {
  mosaic: DeepSignal<MosaicState>;
  root: string;
  onMosaicChange: MosaicChangeHandler;
};
type StorybookDataProps = { label: string; description: string };

// REARRANGE

const rearrangeMosaicId = faker.string.uuid();
const rearrangeTiles = [...Array(4)].reduce((acc: MosaicState['tiles'], _, index) => {
  const id = getDndId(rearrangeMosaicId, faker.string.uuid());
  acc[id] = {
    id,
    index: `a${index}`,
    ...(index === 0
      ? { variant: 'stack', sortable: true }
      : { variant: 'card', copyClass: new Set([rearrangeMosaicId]) }),
  };
  return acc;
}, {});

const rearrangeIds = Object.keys(rearrangeTiles);

const RearrangeDelegator = forwardRef<HTMLDivElement, DelegatorProps<StorybookDataProps>>(
  (
    { data, tile, dragHandleAttributes, dragHandleListeners, style, children, isActive, isCopyDestination, isPreview },
    forwardedRef,
  ) => {
    const { label, description } = data;
    return tile.variant === 'card' ? (
      <div
        role='group'
        className={mx(
          groupSurface,
          surfaceElevation({ elevation: 'group' }),
          'rounded relative',
          isPreview ? 'opacity-50' : isActive && 'opacity-0',
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
      <div role='group' className={mx('p-2 m-2 space-b-2 rounded-xl', isCopyDestination && dropRing)}>
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
    ...rearrangeSectionIds.reduce((acc: MosaicState['relations'], id) => {
      acc[id] = { parent: new Set([rearrangeRootId]) };
      return acc;
    }, {}),
  },
};
const rearrangeMosaic = deepSignal<MosaicState>(rearrangeMosaicState);
const rearrangeData = rearrangeIds.reduce((acc: Record<string, StorybookDataProps>, id) => {
  const [_, entityId] = parseDndId(id);
  acc[entityId] = {
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
  };
  return acc;
}, {});

rearrangeMosaic.$tiles?.subscribe((items) => console.log('[mosaic.stories]', 'items update', Object.keys(items)));

// const onMosaicChange = (event: MosaicChangeEvent) => console.log('[on mosaic change]', event);

// @ts-ignore
export const Rearrange = {
  args: {},
  render: (props: Pick<MosaicStoryArgs, 'onMosaicChange'>) => {
    return (
      <Mosaic.Provider
        {...props}
        Delegator={RearrangeDelegator as FC<DelegatorProps>}
        getData={(dndId) => {
          const [_, entityId] = parseDndId(dndId);
          return rearrangeData[entityId];
        }}
        mosaic={rearrangeMosaic}
        copyTile={(id, _toId, mosaic) => ({
          ...mosaic.tiles[id],
        })}
      >
        <Mosaic.Root id={rearrangeMosaicId}>
          <Mosaic.Tile {...(rearrangeMosaic.tiles[rearrangeRootId] as StackTile)} />
        </Mosaic.Root>
        <Mosaic.Overlay />
      </Mosaic.Provider>
    );
  },
};

// COPY

const copyMosaicId = faker.string.uuid();
const copyTiles = [...Array(4)].reduce((acc: MosaicState['tiles'], _, index) => {
  const id = getDndId(copyMosaicId, faker.string.uuid());
  acc[id] = {
    id,
    index: `a${index}`,
    ...(index === 0 ? { variant: 'stack', sortable: true, acceptCopyClass: rearrangeMosaicId } : { variant: 'card' }),
  };
  return acc;
}, {});

const copyIds = Object.keys(copyTiles);

const copyRootId = copyIds[0];
const copySectionIds = Object.keys(copyTiles).filter((id) => id !== copyRootId);
const copyMosaicState = {
  tiles: copyTiles,
  relations: {
    [copyRootId]: {
      child: new Set(copySectionIds),
    },
    ...copySectionIds.reduce((acc: MosaicState['relations'], id) => {
      acc[id] = { parent: new Set([copyRootId]) };
      return acc;
    }, {}),
  },
};
const copyMosaic = deepSignal<MosaicState>({
  tiles: { ...copyMosaicState.tiles, ...rearrangeMosaicState.tiles },
  relations: { ...copyMosaicState.relations, ...rearrangeMosaicState.relations },
});
const copyData = copyIds.reduce((acc: Record<string, StorybookDataProps>, id) => {
  const [_, entityId] = parseDndId(id);
  acc[entityId] = {
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
  };
  return acc;
}, rearrangeData);

// @ts-ignore
export const Copy = {
  args: {},
  render: (rootProps: Pick<MosaicStoryArgs, 'onMosaicChange'>) => {
    return (
      <Mosaic.Provider
        Delegator={RearrangeDelegator as FC<DelegatorProps>}
        copyTile={(id, toId, mosaic) => {
          const [_, cardId] = parseDndId(id);
          const [stackId] = parseDndId(toId);
          const nextId = getDndId(stackId, cardId);
          return { ...mosaic.tiles[id], id: nextId, copyClass: new Set([stackId]) };
        }}
        getData={(dndId) => {
          const [_, entityId] = parseDndId(dndId);
          return copyData[entityId];
        }}
        mosaic={copyMosaic}
        {...rootProps}
      >
        <div className='fixed inset-0 flex'>
          <div className='min-is-0 flex-1 overflow-y-auto'>
            <Mosaic.Root id={rearrangeMosaicId}>
              <Mosaic.Tile {...(copyMosaic.tiles[rearrangeRootId] as StackTile)} />
            </Mosaic.Root>
          </div>
          <div className='min-is-0 flex-1 overflow-y-auto'>
            <Mosaic.Root id={copyMosaicId}>
              <Mosaic.Tile {...(copyMosaic.tiles[copyRootId] as StackTile)} />
            </Mosaic.Root>
          </div>
        </div>
        <Mosaic.Overlay />
      </Mosaic.Provider>
    );
  },
};

// @ts-ignore
export default {
  component: Mosaic.Provider,
  argTypes: { onMosaicChange: { action: 'mosaic changed' } },
};
