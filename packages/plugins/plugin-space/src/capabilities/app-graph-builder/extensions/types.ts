//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, Segments } from '@dxos/app-toolkit';
import { type Space, SpaceState, isSpace } from '@dxos/client/echo';
import { Collection, Filter, Obj, Query, Type } from '@dxos/echo';
import { EntityKind, SystemTypeAnnotation, getTypeAnnotation } from '@dxos/echo/internal';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { CreateAtom, GraphBuilder, Node } from '@dxos/plugin-graph';
import { ViewAnnotation } from '@dxos/schema';
import { createFilename, isNonNullable } from '@dxos/util';

import { meta } from '../../../meta';
import { SpaceOperation } from '../../../types';

import {
  ADD_VIEW_TO_SCHEMA_LABEL,
  BLOCK_REORDER_ABOVE,
  type MetadataResolver,
  SNAPSHOT_BY_SCHEMA_LABEL,
  STATIC_SCHEMA_TYPE,
  TYPES_SECTION_TYPE,
  TYPE_COLLECTION_TYPE,
  buildViewIndex,
  createObjectNode,
  downloadBlob,
  getDynamicLabel,
  whenSpace,
} from './shared';

//
// Extension Factory
//

/** Creates type-related extensions: types section, schema nodes, schema children, and schema actions. */
export const createTypeExtensions = Effect.fnUntraced(function* () {
  const capabilities = yield* Capability.Service;

  const resolve = (_get: any) => (typename: string) =>
    capabilities.getAll(AppCapabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

  return yield* Effect.all([
    // Types section virtual node under each space.
    GraphBuilder.createExtension({
      id: `${meta.id}.types-section`,
      match: whenSpace,
      connector: (space, get) => {
        const spaceState = get(CreateAtom.fromObservable(space.state));
        if (spaceState !== SpaceState.SPACE_READY) {
          return Effect.succeed([]);
        }

        return Effect.succeed([
          {
            id: Segments.types,
            type: TYPES_SECTION_TYPE,
            data: null,
            properties: {
              label: ['types section label', { ns: meta.id }],
              icon: 'ph--shapes--regular',
              iconHue: 'neutral',
              role: 'branch',
              testId: 'spacePlugin.typesSection',
              draggable: false,
              droppable: false,
              space,
            },
          },
        ]);
      },
    }),

    // Schema nodes under the Types virtual node.
    GraphBuilder.createExtension({
      id: `${meta.id}.types`,
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return node.type === TYPES_SECTION_TYPE && space ? Option.some(space) : Option.none();
      },
      connector: (space, get) => {
        // Reactive subscription to database schema objects so the connector re-runs on schema changes.
        get(AtomQuery.make(space.db, Filter.type(Type.PersistentType)));
        // Reactive subscription to client/plugin-contributed schemas so the connector re-runs when new schemas or static schemas are added.
        const staticSchemas = get(capabilities.atom(AppCapabilities.Schema)).flat();
        // TODO(wittjosiah): Schema registry needs to support reactive queries as well as changes to static schemas.
        const databaseSchemas = space.db.schemaRegistry.query({ location: ['database'] }).runSync();
        const allSchemas = uniqueSchemasByTypename([...staticSchemas, ...databaseSchemas]);

        const userSchemas = allSchemas.filter((schema) => {
          if (getTypeAnnotation(schema)?.kind === EntityKind.Relation) {
            return false;
          }
          if (SystemTypeAnnotation.get(schema).pipe(Option.getOrElse(() => false))) {
            return false;
          }
          if (ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false))) {
            return false;
          }
          if (Type.getTypename(schema) === Collection.Collection.typename) {
            return false;
          }
          return true;
        });

        const viewIndex = buildViewIndex(get, space, allSchemas);

        const visibleSchemas = userSchemas.filter((schema) => {
          if (Type.isMutable(schema)) {
            return true;
          }
          const typename = Type.getTypename(schema);
          const objects = get(AtomQuery.make(space.db, Filter.typename(typename)));
          return objects.length > 0 || viewIndex.typenamesWithViews.has(typename);
        });

        return Effect.succeed(
          visibleSchemas.map((schema) => createSchemaNode({ schema, space, resolve: resolve(get), get })),
        );
      },
    }),

    // {All} virtual node + view objects under each schema node.
    GraphBuilder.createExtension({
      id: `${meta.id}.schema-children`,
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return space && (Obj.instanceOf(Type.PersistentType, node.data) || Schema.isSchema(node.data))
          ? Option.some({ space, schema: node.data })
          : Option.none();
      },
      connector: ({ space, schema }, get) => {
        const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
        const schemas = client?.graph.schemaRegistry.query({ location: ['runtime'] }).runSync() ?? [];

        const typename = Schema.isSchema(schema) ? Type.getTypename(schema as Type.AnyObj) : schema.typename;

        // {All} virtual node.
        const allNode = {
          id: 'all',
          type: TYPE_COLLECTION_TYPE,
          data: { space, typename },
          properties: {
            label: ['type collection all label', { ns: meta.id }],
            icon: 'ph--list--regular',
            iconHue: 'neutral',
            role: 'branch',
            testId: `spacePlugin.typeCollectionAll.${typename}`,
            selectable: false,
            draggable: false,
            droppable: false,
            childrenDroppable: false,
            blockInstruction: BLOCK_REORDER_ABOVE,
          },
        };

        // View objects for this schema.
        const viewIndex = buildViewIndex(get, space, schemas);
        const viewNodes = viewIndex
          .getViewsForTypename(typename)
          .map((object: Obj.Unknown) =>
            createObjectNode({
              db: space.db,
              object,
              resolve: resolve(get),
              droppable: false,
            }),
          )
          .filter(isNonNullable);

        return Effect.succeed([allNode, ...viewNodes]);
      },
    }),

    // Objects of the schema type under the {All} node.
    GraphBuilder.createExtension({
      id: `${meta.id}.type-collection-objects`,
      match: (node) => {
        if (node.type !== TYPE_COLLECTION_TYPE || !node.data?.space || !node.data?.typename) {
          return Option.none();
        }
        return Option.some({ space: node.data.space as Space, typename: node.data.typename as string });
      },
      connector: ({ space, typename }, get) => {
        const objects = get(AtomQuery.make(space.db, Filter.typename(typename)));

        return Effect.succeed(
          objects
            .map((object: Obj.Unknown) => {
              get(AtomObj.make(object));
              return createObjectNode({
                db: space.db,
                object,
                resolve: resolve(get),
                droppable: false,
              });
            })
            .filter(isNonNullable),
        );
      },
    }),

    // Actions for schema nodes.
    GraphBuilder.createExtension({
      id: `${meta.id}.schema-actions`,
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return space && Schema.isSchema(node.data) ? Option.some({ space, schema: node.data }) : Option.none();
      },
      actions: ({ space, schema }, get) => {
        const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
        const schemas = client?.graph.schemaRegistry.query({ location: ['runtime'] }).runSync() ?? [];

        const targetTypename = Type.getTypename(schema as Type.AnyObj);
        const viewIndex = buildViewIndex(get, space, schemas);
        const deletable =
          Type.isMutable(schema as Type.AnyObj) && viewIndex.getViewsForTypename(targetTypename).length === 0;

        return Effect.succeed(
          createSchemaActions({
            schema: schema as Type.AnyObj,
            space,
            deletable,
            resolve: resolve(get),
          }),
        );
      },
    }),
  ]);
});

//
// Helpers
//

/** Returns schemas keyed uniquely by typename, preferring later entries. */
const uniqueSchemasByTypename = <TSchema extends Type.AnyEntity>(schemas: TSchema[]): TSchema[] => {
  const uniqueSchemas = new Map<string, TSchema>();
  for (const schema of schemas) {
    uniqueSchemas.set(Type.getTypename(schema), schema);
  }

  return [...uniqueSchemas.values()];
};

/** Builds a graph node for a schema in the Types subtree. */
const createSchemaNode = ({
  schema,
  space,
  resolve,
  get,
}: {
  schema: Type.AnyEntity;
  space: Space;
  resolve: MetadataResolver;
  get: Atom.Context;
}): Node.Node => {
  const typename = Type.getTypename(schema);
  const metadata = resolve(typename);
  const { label, nodeId } = Match.value(schema).pipe(
    Match.when(Type.isMutable, (mutableSchema) => {
      const persistentSchema = mutableSchema.persistentSchema;
      const snapshot = get(AtomObj.make(persistentSchema));
      return {
        label: snapshot.name || ['object name placeholder', { ns: Type.PersistentType.typename }],
        nodeId: typename,
      };
    }),
    Match.orElse(() => ({
      label: getDynamicLabel('typename label', typename, { count: 2, default: typename }),
      nodeId: typename,
    })),
  );
  const icon = Type.isMutable(schema) ? 'ph--cube--regular' : (metadata.icon ?? 'ph--placeholder--regular');
  const iconHue = Type.isMutable(schema) ? 'neutral' : metadata.iconHue;
  return {
    id: nodeId,
    type: STATIC_SCHEMA_TYPE,
    data: schema,
    properties: {
      label,
      icon,
      iconHue,
      role: 'branch',
      testId: `spacePlugin.schemaNode.${typename}`,
      selectable: false,
      draggable: false,
      droppable: false,
      childrenDroppable: false,
      space,
    },
  };
};

/** Builds schema actions (add view, rename, delete, snapshot). */
const createSchemaActions = ({
  schema,
  space,
  deletable,
  resolve,
}: {
  schema: Type.AnyObj;
  space: Space;
  deletable: boolean;
  resolve: MetadataResolver;
}) => {
  const typename = Type.getTypename(schema);
  const metadata = resolve(typename);
  const createObjectFn = metadata.createObject;
  const inputSchema = metadata.inputSchema;

  const actions: Node.NodeArg<Node.ActionData<Operation.Service>>[] = [
    ...(createObjectFn
      ? [
          {
            id: SpaceOperation.OpenCreateObject.meta.key,
            type: Node.ActionType,
            data: Effect.fnUntraced(function* () {
              if (inputSchema) {
                yield* Operation.invoke(SpaceOperation.OpenCreateObject, {
                  target: space.db,
                  typename,
                });
              } else {
                const createdObject = yield* createObjectFn({}, { db: space.db }) as Effect.Effect<
                  Obj.Unknown,
                  Error,
                  never
                >;
                const addResult = yield* Operation.invoke(SpaceOperation.AddObject, {
                  target: space.db,
                  hidden: true,
                  object: createdObject,
                });
                if (addResult.subject) {
                  yield* Operation.invoke(LayoutOperation.Open, { subject: addResult.subject });
                }
              }
            }),
            properties: {
              label: getDynamicLabel('add object label', typename),
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.createObject',
            },
          },
        ]
      : []),
    {
      id: `${SpaceOperation.AddObject.meta.key}-view`,
      type: Node.ActionType,
      data: () =>
        Operation.invoke(SpaceOperation.OpenCreateObject, {
          target: space.db,
          views: true,
          initialFormValues: { typename: Type.getTypename(schema) },
        }),
      properties: {
        label: ADD_VIEW_TO_SCHEMA_LABEL,
        icon: 'ph--circles-three-plus--regular',
        disposition: 'list-item',
        testId: 'spacePlugin.addViewToSchema',
      },
    },
    {
      id: SpaceOperation.RenameObject.meta.key,
      type: Node.ActionType,
      data: (params?: Node.InvokeProps) =>
        Type.isMutable(schema)
          ? Operation.invoke(SpaceOperation.RenameObject, {
              object: (schema as Type.RuntimeType).persistentSchema as any,
              caller: `${params?.caller}:${params?.parent?.id}`,
            })
          : Effect.fail(new Error('Cannot rename immutable schema')),
      properties: {
        label: getDynamicLabel('rename object label', Type.getTypename(Type.PersistentType)),
        icon: 'ph--pencil-simple-line--regular',
        disabled: !Type.isMutable(schema),
        disposition: 'list-item',
        testId: 'spacePlugin.renameObject',
      },
    },
    {
      id: SpaceOperation.RemoveObjects.meta.key,
      type: Node.ActionType,
      data: () =>
        Type.isMutable(schema)
          ? Operation.invoke(SpaceOperation.RemoveObjects, {
              objects: [(schema as Type.RuntimeType).persistentSchema as Obj.Unknown],
            })
          : Effect.succeed(undefined),
      properties: {
        label: getDynamicLabel('delete object label', Type.getTypename(Type.PersistentType)),
        icon: 'ph--trash--regular',
        disposition: 'list-item',
        disabled: !deletable,
        testId: 'spacePlugin.deleteObject',
      },
    },
    {
      id: SpaceOperation.Snapshot.meta.key,
      type: Node.ActionType,
      data: Effect.fnUntraced(function* () {
        const result = yield* Operation.invoke(SpaceOperation.Snapshot, {
          db: space.db,
          query: Query.select(Filter.type(schema)).ast,
        });
        if (result.snapshot) {
          yield* Effect.tryPromise(() =>
            downloadBlob(result.snapshot, createFilename({ parts: [space.id, Type.getTypename(schema)], ext: 'json' })),
          );
        }
      }),
      properties: {
        label: SNAPSHOT_BY_SCHEMA_LABEL,
        icon: 'ph--camera--regular',
        disposition: 'list-item',
      },
    },
  ];

  return actions;
};
