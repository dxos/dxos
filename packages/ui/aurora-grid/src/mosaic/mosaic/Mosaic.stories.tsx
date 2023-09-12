//
// Copyright 2023 DXOS.org
//
import '@dxosTheme';
import { faker } from '@faker-js/faker';
import { DotsSixVertical } from '@phosphor-icons/react';
import { deepSignal, DeepSignal } from 'deepsignal';
import React, { FC } from 'react';

import { Button } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';

import type { DelegatorProps, Mosaic as MosaicType, MosaicProps } from '../types';
import { Mosaic } from './Mosaic';

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

const data = ids.reduce((acc: MosaicProps['data'], id) => {
  acc[id] = {
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
  };
  return acc;
}, {});

const StorybookDelegator = ({ data, tileVariant, dragHandleAttributes, dragHandleListeners }: DelegatorProps) => {
  const { label, description } = data as { label: string; description: string };
  return (
    <>
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
    </>
  );
};

const rootId = ids[0];

const stackMosaic = deepSignal<MosaicType>({
  tiles,
  relations: {
    [rootId]: {
      child: new Set(Object.keys(tiles).filter((id) => id !== rootId)),
    },
  },
});

stackMosaic.$tiles?.subscribe((items) => console.log('[mosaic.stories]', 'items update', Object.keys(items)));
stackMosaic.tiles?.[Object.keys(tiles)[1]]?.$index?.subscribe((nextIndex) =>
  console.log('[mosaic.stories]', 'first item index update', nextIndex),
);

export const Stack: {
  args: { mosaic: DeepSignal<MosaicType>; root: string; data: Record<string, any>; Delegator: FC<DelegatorProps> };
} = {
  args: {
    mosaic: stackMosaic,
    root: rootId,
    data,
    Delegator: StorybookDelegator,
  },
};

export default {
  component: Mosaic,
};
