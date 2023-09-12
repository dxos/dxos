//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import { deepSignal, DeepSignal } from 'deepsignal';

import type { Mosaic as MosaicType } from '../types';
import { Mosaic } from './Mosaic';

faker.seed(1234);
const fake = faker.helpers.fake;

let rootId = 'never';

const items = [...Array(10)].reduce((acc: Mosaic['items'], _, index) => {
  const id = faker.string.uuid();
  if (index === 0) {
    rootId = id;
  }
  acc[id] = {
    id,
    label: fake('{{commerce.productMaterial}} {{animal.cetacean}}'),
    description: fake('{{commerce.productDescription}}'),
    index: `a${index}`,
    ...(index === 0 ? { variant: 'stack' } : { variant: 'card' }),
  };
  return acc;
}, {});

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
