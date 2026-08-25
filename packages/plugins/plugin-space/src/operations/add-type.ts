// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import { Database, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { SpaceCapabilities, SpaceEvents, SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.AddType> = SpaceOperation.AddType.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      invariant(
        (input.type == null) !== (input.jsonSchema == null),
        'Pass exactly one of `type` (instantiated) or `jsonSchema` (described).',
      );

      const { db } = yield* Database.Service;

      const type = yield* Effect.promise(() => db.addType(input.type ?? describedType(input)));
      Type.update(type, (draft) => {
        if (input.name) {
          draft.name = input.name;
        }
        const meta = Type.getMeta(draft);
        if (input.typename) {
          meta.key = input.typename;
        }
        if (input.version) {
          meta.version = input.version;
        }
      });

      // Read from the ambient context rather than declared: a headless host (edge, `dx mcp serve`)
      // binds neither manager, and a declared service would resolve eagerly and die there.
      // Activation first, since it is what makes a lazy module contribute its `OnTypeAdded` callback.
      const pluginManager = yield* Effect.serviceOption(Plugin.Service);
      yield* Option.match(pluginManager, {
        onNone: () => Effect.void,
        onSome: (manager) => manager.activate(SpaceEvents.TypeAdded),
      });
      const capabilityManager = yield* Effect.serviceOption(Capability.Service);
      const onTypeAdded = Option.match(capabilityManager, {
        onNone: () => [],
        onSome: (manager) => manager.getAll(SpaceCapabilities.OnTypeAdded),
      });
      yield* Effect.all(
        onTypeAdded.map((callback) => callback({ db, type, show: input.show })),
        { concurrency: 'unbounded' },
      );

      return { id: type.id, object: type };
    }),
  ),
);
export default handler;

/** Builds the type from the JSON Schema a caller that cannot hold a live schema sends instead. */
const describedType = ({ typename, jsonSchema }: { typename?: string; jsonSchema?: Record<string, any> }) => {
  invariant(typename, 'Pass a `typename` with `jsonSchema`.');
  invariant(jsonSchema, 'Pass a `jsonSchema`.');
  return Type.makeObjectFromJsonSchema({ typename, version: '0.1.0', jsonSchema });
};
