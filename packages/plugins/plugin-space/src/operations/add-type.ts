// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import { Database, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { SpaceCapabilities, SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.AddType> = SpaceOperation.AddType.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      invariant(
        (input.type == null) !== (input.jsonSchema == null),
        'Pass exactly one of `type` (instantiated) or `jsonSchema` (described).',
      );

      const { db } = yield* Database.Service;

      const type = yield* Effect.promise(() => db.addType(input.type ?? describedType(input)));
      Type.update(type, (type) => {
        if (input.name) {
          type.name = input.name;
        }
        const meta = Type.getMeta(type);
        if (input.typename) {
          meta.key = input.typename;
        }
        if (input.version) {
          meta.version = input.version;
        }
      });

      // Read from the ambient context rather than declared: a headless host (edge, `dx mcp serve`)
      // binds neither manager, and a declared service would resolve eagerly and die there. A process
      // resolves only the services it declares, so a caller with the managers in hand is told the
      // plugins were not notified and does it itself (see `notified`).
      const plugins = yield* Effect.serviceOption(Plugin.Service);
      const capabilities = yield* Effect.serviceOption(Capability.Service);
      const notified = Option.isSome(plugins) && Option.isSome(capabilities);
      if (notified) {
        yield* SpaceCapabilities.notifyTypeAdded(
          { plugins: plugins.value, capabilities: capabilities.value },
          { db, type, show: input.show },
        );
      }

      return { id: type.id, object: type, notified };
    }),
  ),
);
export default handler;

/** Builds the type from the JSON Schema a caller that cannot hold a live schema sends instead. */
const describedType = ({ typename, jsonSchema }: { typename?: string; jsonSchema?: Record<string, any> }) => {
  invariant(typename, 'Pass a `typename` with `jsonSchema`.');
  invariant(jsonSchema, 'Pass a `jsonSchema`.');
  return Type.makeObjectFromJsonSchema({ typename, version: '0.1.0', jsonSchema: withIdProperty(jsonSchema) });
};

/**
 * Declares `id` on a closed schema that leaves it out, since every stored object carries one and a
 * closed schema without it rejects every draft with `Unknown property: id`.
 */
const withIdProperty = (jsonSchema: Record<string, any>): Record<string, any> =>
  jsonSchema.additionalProperties === false && !('id' in (jsonSchema.properties ?? {}))
    ? { ...jsonSchema, properties: { id: { type: 'string' }, ...jsonSchema.properties } }
    : jsonSchema;
