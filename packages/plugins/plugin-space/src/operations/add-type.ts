// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Database, Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { SpaceCapabilities, SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.AddType> = SpaceOperation.AddType.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      invariant(
        (input.type == null) !== (input.jsonSchema == null),
        'Pass exactly one of `type` (instantiated) or `jsonSchema` (described).',
      );

      const { db } = yield* Database.Service;

      const type = yield* Effect.promise(async () => db.addType(input.type ?? (await describedType(db, input))));
      Type.update(type, (type) => {
        if (input.name) {
          type.name = input.name;
        }
        // A described type is built under its typename and version, so only a live one is relabelled.
        const meta = Type.getMeta(type);
        if (input.type && input.typename) {
          meta.key = input.typename;
        }
        if (input.type && input.version) {
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

const DEFAULT_VERSION = '0.1.0';

/**
 * Builds the type from the JSON Schema a caller that cannot hold a live schema sends instead.
 *
 * Built at the requested version because `db.addType` returns the stored type for a typename and
 * version it already holds, so a revised definition is only stored under a new version.
 */
const describedType = async (
  db: Database.Database,
  {
    typename,
    version = DEFAULT_VERSION,
    jsonSchema,
  }: { typename?: string; version?: string; jsonSchema?: Record<string, any> },
) => {
  invariant(typename, 'Pass a `typename` with `jsonSchema`.');
  invariant(jsonSchema, 'Pass a `jsonSchema`.');
  // Identity and kind come from the input, not from a schema copied out of `queryTypes`, whose
  // stored typename and version would otherwise win over the ones requested.
  const {
    $id: _id,
    typename: _typename,
    version: _version,
    entityKind,
    relationSource,
    relationTarget,
    ...fields
  } = withIdProperty(jsonSchema);
  if (entityKind !== 'relation') {
    return Type.makeObjectFromJsonSchema({ typename, version, jsonSchema: fields });
  }

  const types = await db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())).run();
  return Type.makeRelationFromJsonSchema({
    typename,
    version,
    jsonSchema: fields,
    source: resolveEndType(types, relationSource?.$ref),
    target: resolveEndType(types, relationTarget?.$ref),
  });
};

/**
 * Resolves a relation end's `$ref` - the form `queryTypes` reports - against the space's types; an
 * end left unnamed, or naming the any-object type, admits every object.
 */
const resolveEndType = (types: Type.AnyEntity[], uri: string | undefined): Type.AnyObj | typeof Obj.Unknown => {
  if (uri == null || (DXN.isDXN(uri) && DXN.getName(uri) === Annotation.getTypeAnnotation(Obj.Unknown)?.typename)) {
    return Obj.Unknown;
  }

  // A registered declaration wins over a copy persisted in the space, which is matched otherwise.
  const typename = DXN.isDXN(uri) ? DXN.getName(uri) : undefined;
  const version = DXN.isDXN(uri) ? DXN.getVersion(uri) : undefined;
  const candidates = types.filter(
    (candidate) =>
      Type.isObject(candidate) &&
      Type.getTypename(candidate) === typename &&
      (version == null || Type.getMeta(candidate).version === version),
  );
  const type = candidates.find((candidate) => Type.getDatabase(candidate) == null) ?? candidates[0];
  invariant(
    type && Type.isObject(type),
    `Relation end must name an object type the space knows as \`dxn:<typename>\`: ${uri}`,
  );
  return type;
};

/**
 * Declares `id` on a schema that leaves it out, since every stored object carries one and the stored
 * schema is closed, so without it every draft is rejected with `Unknown property: id`.
 */
const withIdProperty = (jsonSchema: Record<string, any>): Record<string, any> =>
  'id' in (jsonSchema.properties ?? {})
    ? jsonSchema
    : { ...jsonSchema, properties: { id: { type: 'string' }, ...jsonSchema.properties } };
