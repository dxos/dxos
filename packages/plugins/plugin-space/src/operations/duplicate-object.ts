// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { cloneObject } from '../util';
import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.DuplicateObject> = SpaceOperation.DuplicateObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const capabilityManager = yield* Capability.Service;
      const resolve = (typename: string) =>
        capabilityManager.getAll(AppCapabilities.Metadata).find(({ id }: { id: string }) => id === typename)
          ?.metadata ?? {};

      const object = input.object as Obj.Unknown;
      const db = Obj.getDatabase(object);
      invariant(db, 'Database not found.');
      const newObject = yield* Effect.promise(() => cloneObject(object, resolve, db));
      yield* Operation.invoke(SpaceOperation.AddObject, { object: newObject, target: db });
    }),
  ),
);
export default handler;
