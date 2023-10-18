//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { DotsSixVertical } from '@phosphor-icons/react';
import { type DeepSignal, deepSignal } from 'deepsignal';
import React, { type FC, forwardRef } from 'react';

import { Button } from '@dxos/aurora';
import { dropRing, getSize, groupSurface, mx, surfaceElevation } from '@dxos/aurora-theme';

import { Mosaic } from './Mosaic';
import type { DelegatorProps, MosaicChangeHandler, MosaicState } from './types';
import { getDndId, parseDndId } from './util';

faker.seed(1234);
const fake = faker.helpers.fake;

type MosaicStoryArgs = {
  mosaic: DeepSignal<MosaicState>;
  root: string;
  onMosaicChange: MosaicChangeHandler;
};

type TestDataProps = { label: string; description: string };

//
// REARRANGE
//

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

const rearrangeData = rearrangeIds.reduce((acc: Record<string, TestDataProps>, id) => {
  const [_, entityId] = parseDndId(id);
  acc[entityId] = {
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
  };
  return acc;
}, {});

// rearrangeMosaic.$tiles?.subscribe((items) => console.log('[mosaic.stories]', 'items update', Object.keys(items)));

// const onMosaicChange = (event: MosaicChangeEvent) => console.log('[on mosaic change]', event);

export const Rearrange = {
  args: {},
  render: (props: Pick<MosaicStoryArgs, 'onMosaicChange'>) => {
    return (
      <Mosaic.Provider
        {...props}
        Delegator={StorybookDelegator as FC<DelegatorProps>}
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
          <Mosaic.Tile {...rearrangeMosaic.tiles[rearrangeRootId]} />
        </Mosaic.Root>
        <Mosaic.Overlay />
      </Mosaic.Provider>
    );
  },
};

//
// COPY
//

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

const copyData = copyIds.reduce((acc: Record<string, TestDataProps>, id) => {
  const [_, entityId] = parseDndId(id);
  acc[entityId] = {
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
  };
  return acc;
}, rearrangeData);

export const Copy = {
  args: {},
  render: (rootProps: Pick<MosaicStoryArgs, 'onMosaicChange'>) => {
    return (
      <Mosaic.Provider
        Delegator={StorybookDelegator as FC<DelegatorProps>}
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
              <Mosaic.Tile {...copyMosaic.tiles[rearrangeRootId]} />
            </Mosaic.Root>
          </div>
          <div className='min-is-0 flex-1 overflow-y-auto'>
            <Mosaic.Root id={copyMosaicId}>
              <Mosaic.Tile {...copyMosaic.tiles[copyRootId]} />
            </Mosaic.Root>
          </div>
        </div>
        <Mosaic.Overlay />
      </Mosaic.Provider>
    );
  },
};

//
// MIGRATE
//

const migrateMosaicId = 'Migrate';

const migrateMosaicRootId = getDndId(migrateMosaicId, faker.string.uuid());

const migrateMosaicState = [...Array(1)].reduce(
  (acc: MosaicState, _, i) => {
    const iid = migrateMosaicRootId;
    const index = `a${i}`;
    acc.tiles[iid] = { id: iid, variant: 'kanban', index, sortable: true };

    const stacksMosaic = [...Array(4)].reduce(
      (acc: MosaicState & { stackIds: string[] }, _, j) => {
        const jid = getDndId(migrateMosaicId, faker.string.uuid());
        const index = `a${j}`;
        acc.tiles[jid] = {
          id: jid,
          variant: 'stack',
          index,
          sortable: true,
          acceptMigrationClass: new Set(['kanban-card']),
        };

        const cardsMosaic = [...Array(4)].reduce(
          (acc: MosaicState, _, k) => {
            const kid = getDndId(migrateMosaicId, faker.string.uuid());
            const index = `a${k}`;
            acc.tiles[kid] = { id: kid, variant: 'card', index, migrationClass: 'kanban-card' };
            acc.relations[kid] = { parent: new Set([jid]), child: new Set() };
            return acc;
          },
          { tiles: {}, relations: {} },
        );

        return {
          tiles: { ...acc.tiles, ...cardsMosaic.tiles },
          relations: {
            [jid]: { parent: new Set([iid]), child: new Set(Object.keys(cardsMosaic.tiles)) },
            ...acc.relations,
            ...cardsMosaic.relations,
          },
          stackIds: [...acc.stackIds, jid],
        };
      },
      { tiles: {}, relations: {}, stackIds: [] },
    );

    return {
      tiles: { ...acc.tiles, ...stacksMosaic.tiles },
      relations: {
        [iid]: { child: new Set(stacksMosaic.stackIds), parent: new Set() },
        ...acc.relations,
        ...stacksMosaic.relations,
      },
    };
  },
  { tiles: {}, relations: {} },
);

const migrateMosaic = deepSignal(migrateMosaicState);

const migrateData = Object.keys(migrateMosaicState.tiles).reduce((acc: Record<string, TestDataProps>, id) => {
  const [_, entityId] = parseDndId(id);
  acc[entityId] = {
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
  };
  return acc;
}, {});

export const Migrate = {
  args: {},
  render: (rootProps: Pick<MosaicStoryArgs, 'onMosaicChange'>) => {
    return (
      <Mosaic.Provider
        Delegator={StorybookDelegator as FC<DelegatorProps>}
        mosaic={migrateMosaic}
        getData={(dndId) => {
          const [_, entityId] = parseDndId(dndId);
          return migrateData[entityId];
        }}
        copyTile={(id, toId, mosaic) => {
          const [_, cardId] = parseDndId(id);
          const [stackId] = parseDndId(toId);
          const nextId = getDndId(stackId, cardId);
          return { ...mosaic.tiles[id], id: nextId, copyClass: new Set([stackId]) };
        }}
        {...rootProps}
      >
        <Mosaic.Root id={migrateMosaicId}>
          <Mosaic.Tile {...migrateMosaic.tiles[migrateMosaicRootId]} />
        </Mosaic.Root>
        <Mosaic.Overlay />
      </Mosaic.Provider>
    );
  },
};

//
// Main
//

const StorybookDelegator = forwardRef<HTMLDivElement, DelegatorProps<TestDataProps>>(
  (
    { data, tile, dragHandleAttributes, dragHandleListeners, style, children, isActive, isCopyDestination, isPreview },
    forwardedRef,
  ) => {
    const { label, description } = data;
    switch (tile.variant) {
      case 'card':
        return (
          <div
            role='group'
            className={mx(
              groupSurface,
              surfaceElevation({ elevation: 'group' }),
              'rounded relative',
              isPreview ? 'opacity-20' : isActive && 'opacity-0',
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
        );

      case 'kanban':
        return (
          <div role='group' className='fixed inset-0 flex' ref={forwardedRef}>
            {children}
          </div>
        );

      case 'stack':
      default:
        return (
          <div role='none' className='min-is-0 flex-1 overflow-y-auto'>
            <div role='group' className={mx('p-2 m-2 space-b-2 rounded-xl', isCopyDestination && dropRing)}>
              {children}
            </div>
          </div>
        );
    }
  },
);

export default {
  component: Mosaic.Provider,
  argTypes: { onMosaicChange: { action: 'mosaic changed' } },
};
