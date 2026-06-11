//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';

import { SpaceOperation } from '#operations';
import { type SpaceCapabilities } from '#types';

/**
 * Creates a synthetic CreateObjectEntry for a database-persisted object schema that has no dedicated plugin capability.
 * Sets inputSchema so the create dialog presents a form for the type's fields.
 */
export const makeCreateObjectEntryForDatabaseType = (type: Type.AnyObj): SpaceCapabilities.CreateObjectEntry => ({
  id: Type.getTypename(type),
  inputSchema: Type.getSchema(type),
  createObject: (props, options) =>
    Effect.gen(function* () {
      const object = Obj.make(type, props);
      return yield* Operation.invoke(SpaceOperation.AddObject, {
        object,
        target: options.target,
        hidden: true,
      });
    }),
});
