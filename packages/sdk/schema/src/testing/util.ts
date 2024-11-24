//
// Copyright 2024 DXOS.org
//

import { Effect } from 'effect';

import { type EchoDatabase, type EchoReactiveObject } from '@dxos/echo-db';
import { type AbstractTypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { createObject, createObjectPipeline } from './generator';
import { OrgType } from './types';

export const createObjects = async <T>(
  db: EchoDatabase,
  type: AbstractTypedObject,
  count: number,
): Promise<EchoReactiveObject<T>[]> => {
  const objects = await Effect.runPromise(createObjectPipeline(count, createObject(OrgType)));
  log('created', { type: type.typename, objects });
  return objects.map((obj) => db.add(obj));
};
