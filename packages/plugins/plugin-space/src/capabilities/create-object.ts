//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Collection, Type } from '@dxos/echo';
import { createDefaultSchema } from '@dxos/schema';
import { Organization, Person, Project, Task } from '@dxos/types';

import { SpaceOperation } from '#operations';
import { SpaceCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Collection.Collection),
        inputSchema: Schema.Struct({ name: Schema.optional(Schema.String) }),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Collection.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Type.Type),
        inputSchema: SpaceOperation.StoredSchemaForm,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const result = yield* Operation.invoke(SpaceOperation.AddType, {
              db: options.db,
              name: props.name,
              type: createDefaultSchema(),
            });
            return {
              id: result.id,
              subject: [],
              object: result.object,
            };
          }),
      }),
      Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Organization.Organization),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Organization.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Person.Person),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Person.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Project.Project),
        inputSchema: Type.getSchema(Project.Project),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Project.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Task.Task),
        inputSchema: Type.getSchema(Task.Task),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Task.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
