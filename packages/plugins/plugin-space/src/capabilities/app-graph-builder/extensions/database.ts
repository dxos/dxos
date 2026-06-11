//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { Capability, type CapabilityManager } from '@dxos/app-framework';
import { AppNode, AppNodeMatcher, LayoutOperation, Segments } from '@dxos/app-toolkit';
import { type Space, SpaceState, isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Annotation, Collection, Entity, Filter, Obj, Query, QueryResult, Scope, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { CreateAtom, GraphBuilder, Node } from '@dxos/plugin-graph';
import { ViewAnnotation } from '@dxos/schema';
import { createFilename, isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { SpaceOperation } from '#operations';
import { SpaceCapabilities } from '#types';

import {
  ADD_VIEW_TO_SCHEMA_LABEL,
  BLOCK_REORDER_ABOVE,
  SNAPSHOT_BY_SCHEMA_LABEL,
  STATIC_SCHEMA_TYPE,
  TYPES_SECTION_TYPE,
  TYPE_COLLECTION_TYPE,
  buildViewIndex,
  createObjectNode,
  downloadBlob,
  getDynamicLabel,
} from './shared';

//
// Extension Factory
//

/** Creates database extensions: types section, schema nodes, schema children, and schema actions. */
export const createDatabaseExtensions = Effect.fnUntraced(function* () {
  const capabilities = yield* Capability.Service;

  return yield* Effect.all([
    // Types section virtual node under each space.
    GraphBuilder.createExtension({
      id: 'typesSection',
      match: AppNodeMatcher.whenSpace,
      connector: (space, get) => {
        const spaceState = get(CreateAtom.fromObservable(space.state));
        if (spaceState !== SpaceState.SPACE_READY) {
          return Effect.succeed([]);
        }

        return Effect.succeed([
          AppNode.makeSection({
            id: Segments.types,
            type: TYPES_SECTION_TYPE,
            label: ['types-section.label', { ns: meta.id }],
            icon: 'ph--database--regular',
            space,
            position: 'last',
            testId: 'spacePlugin.typesSection',
          }),
        ]);
      },
    }),

    // Schema nodes under the Types virtual node.
    GraphBuilder.createExtension({
      id: 'types',
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return node.type === TYPES_SECTION_TYPE && space ? Option.some(space) : Option.none();
      },
      connector: (space, get) => {
        // Persisted types live in the space db; static/runtime types live in the shared registry.
        // Fan across both so the space's own types appear without leaking other spaces' types.
        const allSchemas = get(
          QueryResult.atom(space.db, Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())),
        );

        const userSchemas = allSchemas.filter((type) => {
          if (Type.isRelation(type)) {
            return false;
          }
          if (Type.isTypeKind(type)) {
            return false;
          }
          const schema = Type.getSchema(type);
          if (HiddenAnnotation.get(schema).pipe(Option.getOrElse(() => false))) {
            return false;
          }
          if (Type.getTypename(type) === Type.getTypename(Collection.Collection)) {
            return false;
          }
          return true;
        });

        const viewIndex = buildViewIndex(get, space, allSchemas);

        const visibleSchemas = userSchemas.filter((schema) => {
          if (Type.getDatabase(schema) != null) {
            return true;
          }
          const typename = Type.getTypename(schema);
          const objects = get(QueryResult.atom(space.db, Filter.typename(typename)));
          if (ViewAnnotation.has(schema)) {
            return objects.some((obj) => !viewIndex.isView(obj));
          }
          return objects.length > 0 || viewIndex.typenamesWithViews.has(typename);
        });

        return Effect.succeed(visibleSchemas.map((schema) => createSchemaNode({ schema, space, get })));
      },
    }),

    // {All} virtual node + view objects under each schema node.
    GraphBuilder.createExtension({
      id: 'schemaChildren',
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return space && Type.isType(node.data) ? Option.some({ space, schema: node.data }) : Option.none();
      },
      connector: ({ space, schema }, get) => {
        const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
        const schemas = client ? get(QueryResult.atom(client.graph.registry, Filter.type(Type.Type))) : [];

        const typename = Type.getTypename(schema);

        // {All} virtual node.
        const allNode = Node.make({
          id: 'all',
          type: TYPE_COLLECTION_TYPE,
          data: { space, typename },
          properties: {
            label: ['type-collection-all.label', { ns: meta.id }],
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
        });

        // View objects for this schema.
        const viewIndex = buildViewIndex(get, space, schemas);
        const viewNodes = viewIndex
          .getViewsForTypename(typename!)
          .map((object: Obj.Unknown) =>
            createObjectNode({
              db: space.db,
              object,
              droppable: false,
            }),
          )
          .filter(isNonNullable);

        return Effect.succeed([allNode, ...viewNodes]);
      },
    }),

    // Objects of the schema type under the {All} node.
    GraphBuilder.createExtension({
      id: 'typeCollectionObjects',
      match: (node) => {
        if (node.type !== TYPE_COLLECTION_TYPE || !node.data?.space || !node.data?.typename) {
          return Option.none();
        }
        return Option.some({ space: node.data.space as Space, typename: node.data.typename as string });
      },
      connector: ({ space, typename }, get) => {
        const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
        const schemas = client ? get(QueryResult.atom(client.graph.registry, Filter.type(Type.Type))) : [];
        const viewIndex = buildViewIndex(get, space, schemas);
        const objects = get(QueryResult.atom(space.db, Filter.typename(typename))).filter(
          (object: Obj.Unknown) => !viewIndex.isView(object) && !Obj.getParent(object),
        );

        return Effect.succeed(
          objects
            .map((object: Obj.Unknown) => {
              get(Obj.atom(object));
              return createObjectNode({
                db: space.db,
                object,
                droppable: false,
              });
            })
            .filter(isNonNullable)
            .toSorted((nodeA, nodeB) => {
              const labelA = typeof nodeA.properties.label === 'string' ? nodeA.properties.label : '';
              const labelB = typeof nodeB.properties.label === 'string' ? nodeB.properties.label : '';
              return labelA.localeCompare(labelB);
            }),
        );
      },
    }),

    // Actions for schema nodes.
    GraphBuilder.createExtension({
      id: 'schemaActions',
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return space && Type.isType(node.data) ? Option.some({ space, schema: node.data }) : Option.none();
      },
      actions: ({ space, schema }, get) => {
        const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
        const schemas = client ? get(QueryResult.atom(client.graph.registry, Filter.type(Type.Type))) : [];

        const targetTypename = Type.getTypename(schema);
        const viewIndex = buildViewIndex(get, space, schemas);
        const deletable =
          Type.getDatabase(schema) != null && viewIndex.getViewsForTypename(targetTypename).length === 0;

        return Effect.succeed(createSchemaActions({ type: schema, space, deletable, capabilities }));
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
  get,
}: {
  schema: Type.AnyEntity;
  space: Space;
  get: Atom.Context;
}): Node.NodeArg<Type.AnyEntity> => {
  const typename = Type.getTypename(schema);
  const iconAnnotation =
    Type.getDatabase(schema) == null
      ? Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(schema)))
      : undefined;
  const { label, nodeId } = Match.value(schema).pipe(
    Match.when(
      (value: Type.AnyEntity) => Type.getDatabase(value) != null,
      (mutableSchema) => {
        // Type.AnyEntity has KindId=Type at the type level but is a valid ECHO entity at runtime.
        const snapshot = get(Entity.atom(mutableSchema as unknown as Entity.Unknown));
        return {
          label: (snapshot as { name?: string }).name || [
            'object-name.placeholder',
            { ns: Type.getTypename(Type.Type) },
          ],
          nodeId: typename,
        };
      },
    ),
    Match.orElse(() => ({
      label: getDynamicLabel('typename.label', typename, { count: 2, defaultValue: typename }),
      nodeId: typename,
    })),
  );
  const icon =
    Type.getDatabase(schema) != null ? 'ph--cube--regular' : (iconAnnotation?.icon ?? 'ph--circle-dashed--regular');
  const iconHue = Type.getDatabase(schema) != null ? 'neutral' : iconAnnotation?.hue;
  return Node.make({
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
  });
};

/** Builds schema actions (add view, rename, delete, snapshot). */
const createSchemaActions = ({
  type,
  space,
  deletable,
  capabilities,
}: {
  type: Type.AnyEntity;
  space: Space;
  deletable: boolean;
  capabilities: CapabilityManager.CapabilityManager;
}) => {
  const typename = Type.getTypename(type);
  const createEntry = capabilities
    .getAll(SpaceCapabilities.CreateObjectEntry)
    .find((entry: SpaceCapabilities.CreateObjectEntry) => entry.id === typename);
  const createObjectFn = createEntry?.createObject;
  const inputSchema = createEntry?.inputSchema;

  const actions: Node.NodeArg<Node.ActionData<Operation.Service>>[] = [
    ...(createObjectFn
      ? [
          Node.makeAction({
            id: SpaceOperation.OpenCreateObject.meta.key,
            data: Effect.fnUntraced(function* () {
              if (inputSchema) {
                yield* Operation.invoke(SpaceOperation.OpenCreateObject, {
                  target: space.db,
                  typename,
                });
              } else {
                const result = yield* createObjectFn({}, { db: space.db, target: space.db }).pipe(
                  Effect.provideService(Capability.Service, capabilities),
                );
                if (result.subject.length > 0) {
                  yield* Operation.invoke(LayoutOperation.Open, {
                    subject: [...result.subject],
                    navigation: 'immediate',
                  });
                }
              }
            }),
            properties: {
              label: getDynamicLabel('add object label', typename),
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.createObject',
            },
          }),
        ]
      : []),
    Node.makeAction({
      id: `${SpaceOperation.AddObject.meta.key}-view`,
      data: () =>
        Operation.invoke(SpaceOperation.OpenCreateObject, {
          target: space.db,
          views: true,
          initialFormValues: { typename: Type.getTypename(type) },
        }),
      properties: {
        label: ADD_VIEW_TO_SCHEMA_LABEL,
        icon: 'ph--circles-three-plus--regular',
        disposition: 'list-item',
        testId: 'spacePlugin.addViewToSchema',
      },
    }),
    Node.makeAction({
      id: SpaceOperation.RenameObject.meta.key,
      data: (params?: Node.InvokeProps) =>
        Type.getDatabase(type) != null
          ? Operation.invoke(SpaceOperation.RenameObject, {
              object: type,
              caller: `${params?.caller}:${params?.parent?.id}`,
            })
          : Effect.fail(new Error('Cannot rename immutable schema')),
      properties: {
        label: getDynamicLabel('rename-object.label', Type.getTypename(Type.Type)),
        icon: 'ph--pencil-simple-line--regular',
        disabled: Type.getDatabase(type) == null,
        disposition: 'list-item',
        testId: 'spacePlugin.renameObject',
      },
    }),
    Node.makeAction({
      id: SpaceOperation.RemoveObjects.meta.key,
      data: () =>
        Type.getDatabase(type) != null
          ? Operation.invoke(SpaceOperation.RemoveObjects, {
              objects: [type],
            })
          : Effect.succeed(undefined),
      properties: {
        label: getDynamicLabel('delete object label', Type.getTypename(Type.Type)),
        icon: 'ph--trash--regular',
        disposition: 'list-item',
        disabled: !deletable,
        testId: 'spacePlugin.deleteObject',
      },
    }),
    Node.makeAction({
      id: SpaceOperation.Snapshot.meta.key,
      data: Effect.fnUntraced(function* () {
        const result = yield* Operation.invoke(SpaceOperation.Snapshot, {
          db: space.db,
          query: Query.select(Filter.type(type)).ast,
        });
        if (result.snapshot) {
          yield* Effect.tryPromise(() =>
            downloadBlob(result.snapshot, createFilename({ parts: [space.id, Type.getTypename(type)], ext: 'json' })),
          );
        }
      }),
      properties: {
        label: SNAPSHOT_BY_SCHEMA_LABEL,
        icon: 'ph--camera--regular',
        disposition: 'list-item',
      },
    }),
  ];

  return actions;
};
