//
// Copyright 2023 DXOS.org
//
import { faker } from '@faker-js/faker';
import { deepSignal, DeepSignal } from 'deepsignal';

import '@dxosTheme';

import type { Mosaic as MosaicType } from '../types';
import { Mosaic } from './Mosaic';

faker.seed(1234);
const fake = faker.helpers.fake;

const items = [...Array(10)].reduce((acc: Mosaic['items'], _, index) => {
  const id = faker.string.uuid();
  acc[id] = {
    id,
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
    index: `a${index}`,
    ...(index === 0 ? { variant: 'stack', sortable: true } : { variant: 'card' }),
  };
  return acc;
}, {});

const rootId = Object.keys(items)[0];

const stackMosaic = deepSignal<MosaicType>({
  items,
  relations: {
    [rootId]: {
      child: new Set(Object.keys(items).filter((id) => id !== rootId)),
    },
  },
});

export const Stack: { args: { mosaic: DeepSignal<MosaicType>; root: string } } = {
  args: {
    mosaic: stackMosaic,
    root: rootId,
  },
};

export default {
  component: Mosaic,
};
