//
// Copyright 2021 DXOS.org
//

export { default as hypercore } from '@dxos/vendor-hypercore/hypercore';
export type {
  Hypercore,
  HypercoreOptions,
  HypercoreProperties,
  ReadStreamOptions,
} from '@dxos/vendor-hypercore/hypercore';

export * from './crypto.ts';
export * from './defaults.ts';
export * from './hypercore-factory.ts';
export * from './iterator.ts';
