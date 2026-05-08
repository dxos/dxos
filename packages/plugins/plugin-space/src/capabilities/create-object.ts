//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { Collection } from '@dxos/echo';
import { createDefaultSchema } from '@dxos/schema';
import { Organization, Person, Project, Task } from '@dxos/types';

import { SpaceOperation } from '#operations';
import { SpaceCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Collection.Collection.typename,
        inputSchema: Schema.Struct({ name: Schema.optional(Schema.String) }),
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Collection.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: false,
              targetNodeId: options.targetNodeId,
            });
          })),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Type.PersistentType),
        inputSchema: SpaceOperation.StoredSchemaForm,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const result = yield* Operation.invoke(SpaceOperation.AddSchema, {
              db: options.db,
              name: props.name,
              schema: createDefaultSchema(),
            });
            return {
              id: result.id,
              subject: [],
              object: result.object,
            };
          })),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Organization.Organization.typename,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Organization.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Person.Person.typename,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Person.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Project.Project.typename,
        inputSchema: Project.Project,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Project.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Task.Task.typename,
        inputSchema: Task.Task,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Task.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })),
      }),
    ];
  }),
);
