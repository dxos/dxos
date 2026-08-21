//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Collection, Type } from '@dxos/echo';
import { createDefaultSchema } from '@dxos/schema';
import { Organization, Person, Task } from '@dxos/types';

import { SpaceCapabilities, SpaceOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(Collection.Collection),
          inputSchema: Schema.Struct({ name: Schema.optional(Schema.String) }),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Collection.make(props);
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
        {
          id: Type.getTypename(Type.Type),
          inputSchema: SpaceOperation.StoredSchemaForm,
          createObject: (props, options) =>
            Effect.gen(function* () {
              const result = yield* Operation.invoke(
                SpaceOperation.AddType,
                {
                  name: props.name,
                  type: createDefaultSchema(),
                },
                { spaceId: options.db.spaceId },
              );
              return {
                id: result.id,
                object: result.object,
              };
            }),
        },
        {
          id: Type.getTypename(Organization.Organization),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Organization.make(props);
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
        {
          id: Type.getTypename(Person.Person),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Person.make(props);
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
        {
          id: Type.getTypename(Task.Task),
          inputSchema: Type.getSchema(Task.Task),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Task.make(props);
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
      ]),
    ];
  }),
);
