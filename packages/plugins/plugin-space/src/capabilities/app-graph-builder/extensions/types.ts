//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Space, SpaceState, isSpace } from '@dxos/client/echo';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { EntityKind, SystemTypeAnnotation, getTypeAnnotation } from '@dxos/echo/internal';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { CreateAtom, GraphBuilder, Node } from '@dxos/plugin-graph';
import { Collection, ViewAnnotation, getTypenameFromQuery } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';
import { createFilename } from '@dxos/util';

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
      id: `${meta.id}/types-section`,
      match: whenSpace,
      connector: (space, get) => {
        const spaceState = get(CreateAtom.fromObservable(space.state));
        if (spaceState !== SpaceState.SPACE_READY) {
          return Effect.succeed([]);
        }

        return Effect.succeed([
          {
            id: `${space.id}/types`,
            type: TYPES_SECTION_TYPE,
            data: null,
            properties: {
              label: ['types section label', { ns: meta.id }],
              icon: 'ph--shapes--regular',
              iconHue: 'neutral',
              role: 'branch',
              selectable: false,
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
      id: `${meta.id}/types`,
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return node.type === TYPES_SECTION_TYPE && space ? Option.some(space) : Option.none();
      },
      connector: (space, get) => {
        const allSchemas = space.db.schemaRegistry.query({ location: ['runtime'] }).runSync();

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

        const populatedSchemas = userSchemas.filter((schema) => {
          const typename = Type.getTypename(schema);
          const objects = get(AtomQuery.make(space.db, Filter.typename(typename)));
          return objects.length > 0;
        });

        return Effect.succeed(
          populatedSchemas.map((schema) => createSchemaNode({ schema, space, resolve: resolve(get) })),
        );
      },
    }),

    // {All} virtual node + view objects under each schema node.
    GraphBuilder.createExtension({
      id: `${meta.id}/schema-children`,
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return space && (Obj.instanceOf(Type.PersistentType, node.data) || Schema.isSchema(node.data))
          ? Option.some({ space, schema: node.data })
          : Option.none();
      },
      connector: ({ space, schema }, get) => {
        const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
        const schemas = client?.graph.schemaRegistry.query({ location: ['runtime'] }).runSync() ?? [];

        const typename = Schema.isSchema(schema) ? Type.getTypename(schema as Type.Obj.Any) : schema.typename;

        // {All} virtual node.
        const allNode = {
          id: `${space.id}/${typename}/all`,
          type: TYPE_COLLECTION_TYPE,
          data: { space, typename },
          properties: {
            label: ['type collection all label', { ns: meta.id }],
            icon: 'ph--list--regular',
            iconHue: 'neutral',
            role: 'branch',
            selectable: false,
            draggable: false,
            droppable: false,
            childrenDroppable: false,
            blockInstruction: BLOCK_REORDER_ABOVE,
          },
        };

        // View objects for this schema.
        const viewObjects = getViewsForSchema(get, space, schemas, typename);
        const viewNodes = viewObjects
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
      id: `${meta.id}/type-collection-objects`,
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
      id: `${meta.id}/schema-actions`,
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return space && Schema.isSchema(node.data) ? Option.some({ space, schema: node.data }) : Option.none();
      },
      actions: ({ space, schema }, get) => {
        const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
        const schemas = client?.graph.schemaRegistry.query({ location: ['runtime'] }).runSync() ?? [];

        const targetTypename = Type.getTypename(schema as Type.Obj.Any);
        const filteredViews = getViewsForSchema(get, space, schemas, targetTypename);
        const deletable = filteredViews.length === 0;

        return Effect.succeed(
          createSchemaActions({
            schema: schema as Type.Obj.Any,
            space,
            deletable,
          }),
        );
      },
    }),
  ]);
});

//
// Helpers
//

/** Builds a graph node for a schema in the Types subtree. */
const createSchemaNode = ({
  schema,
  space,
  resolve,
}: {
  schema: Type.Entity.Any;
  space: Space;
  resolve: MetadataResolver;
}): Node.Node => {
  const typename = Type.getTypename(schema);
  const metadata = resolve(typename);
  return {
    id: `${space.id}/${typename}`,
    type: STATIC_SCHEMA_TYPE,
    data: schema,
    properties: {
      label: getDynamicLabel('typename label', typename, {
        count: 2,
        default: typename,
      }),
      icon: metadata.icon ?? 'ph--placeholder--regular',
      iconHue: metadata.iconHue,
      role: 'branch',
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
}: {
  schema: Type.Obj.Any;
  space: Space;
  deletable: boolean;
}) => {
  const getId = (id: string) => `${space.id}/${Type.getTypename(schema)}/${id}`;

  const actions: Node.NodeArg<Node.ActionData<Operation.Service>>[] = [
    {
      id: getId(SpaceOperation.AddObject.meta.key),
      type: Node.ActionType,
      data: () =>
        Operation.invoke(SpaceOperation.OpenCreateObject, {
          target: space.db,
          views: true,
          initialFormValues: { typename: Type.getTypename(schema) },
        }),
      properties: {
        label: ADD_VIEW_TO_SCHEMA_LABEL,
        icon: 'ph--plus--regular',
        disposition: 'list-item-primary',
        testId: 'spacePlugin.addViewToSchema',
      },
    },
    {
      id: getId(SpaceOperation.RenameObject.meta.key),
      type: Node.ActionType,
      data: () => Effect.fail(new Error('Not implemented')),
      properties: {
        label: getDynamicLabel('rename object label', Type.getTypename(Type.PersistentType)),
        icon: 'ph--pencil-simple-line--regular',
        disabled: true,
        disposition: 'list-item',
        testId: 'spacePlugin.renameObject',
      },
    },
    {
      id: getId(SpaceOperation.RemoveObjects.meta.key),
      type: Node.ActionType,
      data: () =>
        Effect.sync(() => {
          const index = space.properties.staticRecords.findIndex(
            (typename: string) => typename === Type.getTypename(schema),
          );
          if (index > -1) {
            Obj.change(space.properties, (props) => {
              props.staticRecords.splice(index, 1);
            });
          }
        }),
      properties: {
        label: getDynamicLabel('delete object label', Type.getTypename(Type.PersistentType)),
        icon: 'ph--trash--regular',
        disposition: 'list-item',
        disabled: !deletable,
        testId: 'spacePlugin.deleteObject',
      },
    },
    {
      id: getId(SpaceOperation.Snapshot.meta.key),
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

/** Helper to get view objects filtered by schema typename. */
const getViewsForSchema = (get: any, space: Space, schemas: Type.Entity.Any[], targetTypename: string) => {
  const filter = Filter.or(
    ...schemas
      .filter((schema) => ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false)))
      .map((schema) => Filter.type(schema)),
  );

  const objects = get(AtomQuery.make(space.db, filter));
  return objects.filter((viewObject: any) => {
    const viewSnapshot = get(AtomObj.make(viewObject));
    const viewRef = (viewSnapshot as any).view;
    const viewTarget = viewRef ? get(AtomObj.make(viewRef)) : undefined;
    return getTypenameFromQuery((viewTarget as any)?.query?.ast) === targetTypename;
  });
};
