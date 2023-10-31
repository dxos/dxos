//
// Copyright 2023 DXOS.org

import { type Item } from '@dxos/echo-db';

import { type AbstractEchoObject } from '../object/object';

//
export const getEchoObjectItem = (object: AbstractEchoObject): Item | undefined => {
  return object._item;
};
