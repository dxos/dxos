//
// Copyright 2024 DXOS.org
//

import { Effect } from 'effect';

import { type EchoDatabase, type ReactiveEchoObject } from '@dxos/echo-db';
import { type BaseObject, type AbstractTypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { createObject, createObjectPipeline } from './generator';

export const createObjects = async <T extends BaseObject>(
  db: EchoDatabase,
  type: AbstractTypedObject,
  count: number,
): Promise<ReactiveEchoObject<T>[]> => {
  const objects = await Effect.runPromise(createObjectPipeline(count, createObject(type)));
  log('created', { type: type.typename, objects });
  return objects.map((obj) => db.add(obj));
};
