//
// Copyright 2023 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { Atom } from '@effect-atom/atom-react';
import type * as Schema from 'effect/Schema';

import { type Capability, Common } from '@dxos/app-framework';
import { type OperationInvoker } from '@dxos/operation';
import { type Space, SpaceState, isSpace } from '@dxos/client/echo';
import { type Database, type Entity, Filter, Obj, Query, type QueryResult, Ref, Type } from '@dxos/echo';
import { EXPANDO_TYPENAME } from '@dxos/echo/internal';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Migrations } from '@dxos/migrations';
import { Graph, Node } from '@dxos/plugin-graph';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention/types';
import { type TreeData } from '@dxos/react-ui-list';
import { Collection } from '@dxos/schema';
import { createFilename } from '@dxos/util';

import { meta } from './meta';
import { SPACE_TYPE, SpaceOperation } from './types';

export const SPACES = `${meta.id}-spaces`;
export const COMPOSER_SPACE_LOCK = `${meta.id}/lock`;
// TODO(wittjosiah): Remove.
export const SHARED = 'shared-spaces';

/**
 * Convert a query result to an Atom value of the objects.
 */
export const atomFromQuery = <T extends Entity.Unknown>(query: QueryResult.QueryResult<T>): Atom.Atom<T[]> => {
  return Atom.make((get) => {
    const unsubscribe = query.subscribe((result) => {
      get.setSelf(result.results);
    });

    get.addFinalizer(() => unsubscribe());
    return query.results;
  });
};

// TODO(wittjosiah): Factor out? Expose via capability?
export const getSpaceDisplayName = (
  space: Space,
  { personal, namesCache = {} }: { personal?: boolean; namesCache?: Record<string, string> } = {},
): string | [string, { ns: string }] => {
  return space.state.get() === SpaceState.SPACE_READY && (space.properties.name?.length ?? 0) > 0
    ? space.properties.name!
    : namesCache[space.id]
      ? namesCache[space.id]
      : personal
        ? ['personal space label', { ns: meta.id }]
        : ['unnamed space label', { ns: meta.id }];
};

const getCollectionGraphNodePartials = ({
  collection,
  db,
  resolve,
}: {
  collection: Collection.Collection;
  db: Database.Database;
  resolve: (typename: string) => Record<string, any>;
}) => {
  return {
    acceptPersistenceClass: new Set(['echo']),
    acceptPersistenceKey: new Set([db.spaceId]),
    role: 'branch',
    onRearrangeChildren: (nextOrder: unknown[]) => {
      // Change on disk.
      collection.objects = nextOrder.filter(Obj.isObject).map(Ref.make);
    },
    onTransferStart: (child: Node.Node<Obj.Any>, index?: number) => {
      // TODO(wittjosiah): Support transfer between spaces.
      // const childSpace = getSpace(child.data);
      // if (space && childSpace && !childSpace.key.equals(space.key)) {
      //   // Create clone of child and add to destination space.
      //   const newObject = clone(child.data, {
      //     // TODO(wittjosiah): This needs to be generalized and not hardcoded here.
      //     additional: [
      //       child.data.content,
      //       ...(child.data.objects ?? []),
      //       ...(child.data.objects ?? []).map((object: TypedObject) => object.content),
      //     ],
      //   });
      //   space.db.add(newObject);
      //   collection.objects.push(newObject);
      // } else {

      // Add child to destination collection.
      // TODO(dmaretskyi): Compare by id.
      if (!collection.objects.find((object) => object.target === child.data)) {
        if (typeof index !== 'undefined') {
          collection.objects.splice(index, 0, Ref.make(child.data));
        } else {
          collection.objects.push(Ref.make(child.data));
        }
      }

      // }
    },
    onTransferEnd: (child: Node.Node<Obj.Any>, destination: Node.Node) => {
      // Remove child from origin collection.
      const index = collection.objects.findIndex((object) => object.target === child.data);
      if (index > -1) {
        collection.objects.splice(index, 1);
      }

      // TODO(wittjosiah): Support transfer between spaces.
      // const childSpace = getSpace(child.data);
      // const destinationSpace =
      //   destination.data instanceof SpaceProxy ? destination.data : getSpace(destination.data);
      // if (destinationSpace && childSpace && !childSpace.key.equals(destinationSpace.key)) {
      //   // Mark child as deleted in origin space.
      //   childSpace.db.remove(child.data);
      // }
    },
    onCopy: async (child: Node.Node<Obj.Any>, index?: number) => {
      // Create clone of child and add to destination space.
      const newObject = await cloneObject(child.data, resolve, db);
      db.add(newObject);
      if (typeof index !== 'undefined') {
        collection.objects.splice(index, 0, Ref.make(newObject));
      } else {
        collection.objects.push(Ref.make(newObject));
      }
    },
  };
};

const getSystemCollectionNodePartials = ({
  collection,
  db,
  resolve,
}: {
  collection: Collection.Managed;
  db: Database.Database;
  resolve: (typename: string) => Record<string, any>;
}) => {
  const metadata = resolve(collection.key);
  return {
    label: ['typename label', { ns: collection.key, count: 2 }],
    icon: metadata.icon,
    iconHue: metadata.iconHue,
    acceptPersistenceClass: new Set(['echo']),
    acceptPersistenceKey: new Set([db.spaceId]),
    role: 'branch',
  };
};

const getSchemaGraphNodePartials = () => {
  return {
    role: 'branch',
    canDrop: () => false,
  };
};

const checkPendingMigration = (space: Space) => {
  return (
    space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION ||
    (space.state.get() === SpaceState.SPACE_READY &&
      !!Migrations.versionProperty &&
      space.properties[Migrations.versionProperty] !== Migrations.targetVersion)
  );
};

export const constructSpaceNode = ({
  space,
  navigable = false,
  personal,
  namesCache,
  resolve,
}: {
  space: Space;
  navigable?: boolean;
  personal?: boolean;
  namesCache?: Record<string, string>;
  resolve: (typename: string) => Record<string, any>;
}) => {
  const hasPendingMigration = checkPendingMigration(space);
  const collection =
    space.state.get() === SpaceState.SPACE_READY && space.properties[Collection.Collection.typename]?.target;
  const partials =
    space.state.get() === SpaceState.SPACE_READY && Obj.instanceOf(Collection.Collection, collection)
      ? getCollectionGraphNodePartials({ collection, db: space.db, resolve })
      : {};

  return {
    id: space.id,
    type: SPACE_TYPE,
    cacheable: ['label', 'icon', 'role'],
    data: space,
    properties: {
      ...partials,
      label: getSpaceDisplayName(space, { personal, namesCache }),
      description: space.state.get() === SpaceState.SPACE_READY && space.properties.description,
      hue: space.state.get() === SpaceState.SPACE_READY && space.properties.hue,
      icon:
        space.state.get() === SpaceState.SPACE_READY && space.properties.icon
          ? `ph--${space.properties.icon}--regular`
          : undefined,
      iconHue: space.state.get() === SpaceState.SPACE_READY && space.properties.iconHue,
      disabled: !navigable || space.state.get() !== SpaceState.SPACE_READY || hasPendingMigration,
      testId: 'spacePlugin.space',
      canDrop: (source: TreeData) => {
        // TODO(wittjosiah): Find a way to only allow space as source for rearranging.
        return Obj.isObject(source.item.data) || isSpace(source.item.data);
      },
    },
    nodes: [
      {
        id: `settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`,
        type: `${meta.id}/settings`,
        data: null,
        properties: {
          label: ['settings panel label', { ns: meta.id }],
          icon: 'ph--faders--regular',
          disposition: 'alternate-tree',
        },
        nodes: [
          {
            id: `properties-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`,
            type: `${meta.id}/properties`,
            data: `${meta.id}/properties`,
            properties: {
              label: ['space settings properties label', { ns: meta.id }],
              icon: 'ph--sliders--regular',
              position: 'hoist',
              testId: 'spacePlugin.general',
            },
          },
          {
            id: `members-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`,
            type: `${meta.id}/members`,
            data: `${meta.id}/members`,
            properties: {
              label: ['members panel label', { ns: meta.id }],
              icon: 'ph--users--regular',
              position: 'hoist',
              testId: 'spacePlugin.members',
            },
          },
          {
            id: `schema-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`,
            type: `${meta.id}/schema`,
            data: `${meta.id}/schema`,
            properties: {
              label: ['space settings schema label', { ns: meta.id }],
              icon: 'ph--shapes--regular',
              testId: 'spacePlugin.schema',
            },
          },
        ],
      },
    ],
  };
};

export const constructSpaceActions = ({
  space,
  invokePromise,
  personal,
  migrating,
}: {
  space: Space;
  invokePromise: OperationInvoker.OperationInvoker['invokePromise'];
  personal?: boolean;
  migrating?: boolean;
}) => {
  const state = space.state.get();
  const hasPendingMigration = checkPendingMigration(space);
  const getId = (id: string) => `${id}/${space.id}`;
  const actions: Node.NodeArg<Node.ActionData>[] = [];

  if (hasPendingMigration) {
    actions.push({
      id: getId(SpaceOperation.Migrate.meta.key),
      type: Node.ActionGroupType,
      data: async () => {
        await invokePromise(SpaceOperation.Migrate, { space });
      },
      properties: {
        label: ['migrate space label', { ns: meta.id }],
        icon: 'ph--database--regular',
        disposition: 'list-item-primary',
        disabled: migrating || Migrations.running(space),
      },
    });
  }

  if (state === SpaceState.SPACE_READY && !hasPendingMigration) {
    actions.push(
      {
        id: getId(SpaceOperation.OpenCreateObject.meta.key),
        type: Node.ActionType,
        data: async () => {
          await invokePromise(SpaceOperation.OpenCreateObject, { target: space.db });
        },
        properties: {
          label: ['create object in space label', { ns: meta.id }],
          icon: 'ph--plus--regular',
          disposition: 'item',
          testId: 'spacePlugin.createObject',
        },
      },
      {
        id: getId(SpaceOperation.Rename.meta.key),
        type: Node.ActionType,
        data: async (params?: Node.InvokeProps) => {
          await invokePromise(SpaceOperation.Rename, { space, caller: params?.caller });
        },
        properties: {
          label: ['rename space label', { ns: meta.id }],
          icon: 'ph--pencil-simple-line--regular',
          keyBinding: {
            macos: 'shift+F6',
            windows: 'shift+F6',
          },
        },
      },
    );
  }

  return actions;
};

export const createStaticSchemaNode = ({
  schema,
  space,
}: {
  schema: Schema.Schema.AnyNoContext;
  space: Space;
}): Node.Node => {
  return {
    id: `${space.id}/${Type.getTypename(schema)}`,
    type: `${meta.id}/static-schema`,
    data: schema,
    properties: {
      label: ['typename label', { ns: Type.getTypename(schema), count: 2, default: Type.getTypename(schema) }],
      icon: 'ph--database--regular',
      iconHue: 'green',
      role: 'branch',
      selectable: false,
      canDrop: () => false,
      space,
    },
  };
};

export const createStaticSchemaActions = ({
  schema,
  space,
  invokePromise,
  deletable,
}: {
  schema: Type.Obj.Any;
  space: Space;
  invokePromise: OperationInvoker.OperationInvoker['invokePromise'];
  deletable: boolean;
}) => {
  const getId = (id: string) => `${space.id}/${Type.getTypename(schema)}/${id}`;

  const actions: Node.NodeArg<Node.ActionData>[] = [
    {
      id: getId(SpaceOperation.AddObject.meta.key),
      type: Node.ActionType,
      data: async () => {
        await invokePromise(SpaceOperation.OpenCreateObject, {
          target: space.db,
          views: true,
          initialFormValues: { typename: Type.getTypename(schema) },
        });
      },
      properties: {
        label: ['add view to schema label', { ns: meta.id }],
        icon: 'ph--plus--regular',
        disposition: 'list-item-primary',
        testId: 'spacePlugin.addViewToSchema',
      },
    },
    {
      id: getId(SpaceOperation.RenameObject.meta.key),
      type: Node.ActionType,
      data: async (params?: Node.InvokeProps) => {
        throw new Error('Not implemented');
      },
      properties: {
        label: ['rename object label', { ns: Type.getTypename(Type.PersistentType) }],
        icon: 'ph--pencil-simple-line--regular',
        disabled: true,
        disposition: 'list-item',
        testId: 'spacePlugin.renameObject',
      },
    },
    {
      id: getId(SpaceOperation.RemoveObjects.meta.key),
      type: Node.ActionType,
      data: async () => {
        const index = space.properties.staticRecords.findIndex(
          (typename: string) => typename === Type.getTypename(schema),
        );
        if (index > -1) {
          space.properties.staticRecords.splice(index, 1);
        }
      },
      properties: {
        label: ['delete object label', { ns: Type.getTypename(Type.PersistentType) }],
        icon: 'ph--trash--regular',
        disposition: 'list-item',
        disabled: !deletable,
        testId: 'spacePlugin.deleteObject',
      },
    },
    {
      id: getId(SpaceOperation.Snapshot.meta.key),
      type: Node.ActionType,
      data: async () => {
        const result = await invokePromise(SpaceOperation.Snapshot, {
          db: space.db,
          query: Query.select(Filter.type(schema)).ast,
        });
        if (result.data?.snapshot) {
          await downloadBlob(
            result.data.snapshot,
            createFilename({ parts: [space.id, Type.getTypename(schema)], ext: 'json' }),
          );
        }
      },
      properties: {
        label: ['snapshot by schema label', { ns: meta.id }],
        icon: 'ph--camera--regular',
        disposition: 'list-item',
      },
    },
  ];

  return actions;
};

export const createObjectNode = ({
  db,
  object,
  disposition,
  droppable = true,
  navigable = false,
  managedCollectionChild = false,
  resolve,
}: {
  db: Database.Database;
  object: Obj.Any;
  disposition?: string;
  droppable?: boolean;
  navigable?: boolean;
  managedCollectionChild?: boolean;
  resolve: (typename: string) => Record<string, any>;
}) => {
  const type = Obj.getTypename(object);
  if (!type) {
    return null;
  }

  const metadata = resolve(type);
  const partials = Obj.instanceOf(Collection.Collection, object)
    ? getCollectionGraphNodePartials({ collection: object, db, resolve })
    : Obj.instanceOf(Collection.Managed, object)
      ? getSystemCollectionNodePartials({ collection: object, db, resolve })
      : Obj.instanceOf(Type.PersistentType, object)
        ? getSchemaGraphNodePartials()
        : metadata.graphProps;

  // TODO(wittjosiah): Obj.getLabel isn't triggering reactivity in some cases.
  //   e.g., create new collection with no name and rename it.
  const label = (object as any).name ||
    Obj.getLabel(object) ||
    // TODO(wittjosiah): Remove metadata labels.
    metadata.label?.(object) || ['object name placeholder', { ns: type, default: 'New item' }];

  const selectable =
    (!Obj.instanceOf(Type.PersistentType, object) &&
      !Obj.instanceOf(Collection.Managed, object) &&
      !Obj.instanceOf(Collection.Collection, object)) ||
    (navigable && Obj.instanceOf(Collection.Collection, object));

  return {
    id: Obj.getDXN(object).toString(),
    type,
    cacheable: ['label', 'icon', 'role'],
    data: object,
    properties: {
      label,
      icon: metadata.icon ?? 'ph--placeholder--regular',
      iconHue: metadata.iconHue,
      disposition,
      testId: 'spacePlugin.object',
      persistenceClass: 'echo',
      persistenceKey: db.spaceId,
      selectable,
      managedCollectionChild,
      blockInstruction: (source: TreeData, instruction: Instruction) => {
        if (source.item.properties.managedCollectionChild) {
          // TODO(wittjosiah): Support reordering system collections.
          // return !(managedCollectionChild && source.item.type === type && instruction.type.startsWith('reorder'));
          return true;
        }

        if (Obj.instanceOf(Collection.Managed, object)) {
          return !instruction.type.startsWith('reorder');
        }

        return managedCollectionChild;
      },
      canDrop: (source: TreeData) => {
        return droppable && Node.isGraphNode(source.item) && Obj.isObject(source.item.data);
      },
      ...partials,
    },
  };
};

export const constructObjectActions = ({
  object,
  graph,
  invokePromise,
  resolve,
  context,
  deletable = true,
  navigable = false,
}: {
  object: Obj.Any;
  graph: Graph.ReadableGraph;
  invokePromise: OperationInvoker.OperationInvoker['invokePromise'];
  resolve: (typename: string) => Record<string, any>;
  context: Capability.PluginContext;
  deletable?: boolean;
  navigable?: boolean;
}) => {
  const db = Obj.getDatabase(object);
  invariant(db, 'Database not found');
  const typename = Obj.getTypename(object);
  invariant(typename, 'Object has no typename');

  const getId = (id: string) => `${id}/${Obj.getDXN(object).toString()}`;

  const managedCollection = Obj.instanceOf(Collection.Managed, object) ? object : undefined;
  const metadata = managedCollection ? resolve(managedCollection.key) : {};
  const createObject = metadata.createObject;
  const inputSchema = metadata.inputSchema;

  const actions: Node.NodeArg<Node.ActionData>[] = [
    ...(Obj.instanceOf(Collection.Collection, object)
      ? [
          {
            id: getId(SpaceOperation.OpenCreateObject.meta.key),
            type: Node.ActionType,
            data: async () => {
              await invokePromise(SpaceOperation.OpenCreateObject, { target: object });
            },
            properties: {
              label: ['create object in collection label', { ns: meta.id }],
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.createObject',
            },
          },
        ]
      : []),
    ...(Obj.instanceOf(Type.PersistentType, object)
      ? [
          {
            id: getId(SpaceOperation.AddObject.meta.key),
            type: Node.ActionType,
            data: async () => {
              await invokePromise(SpaceOperation.OpenCreateObject, {
                target: db,
                views: true,
                initialFormValues: { typename: object.typename },
              });
            },
            properties: {
              label: ['add view to schema label', { ns: meta.id }],
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.addViewToSchema',
            },
          },
          {
            id: getId(SpaceOperation.Snapshot.meta.key),
            type: Node.ActionType,
            data: async () => {
              const result = await invokePromise(SpaceOperation.Snapshot, {
                db,
                query: Query.select(Filter.type(Type.toEffectSchema(object.jsonSchema))).ast,
              });
              if (result.data?.snapshot) {
                await downloadBlob(
                  result.data.snapshot,
                  createFilename({ parts: [db.spaceId, object.typename], ext: 'json' }),
                );
              }
            },
            properties: {
              label: ['snapshot by schema label', { ns: meta.id }],
              icon: 'ph--camera--regular',
              disposition: 'list-item',
            },
          },
        ]
      : []),
    ...(createObject
      ? [
          {
            id: getId(SpaceOperation.OpenCreateObject.meta.key),
            type: Node.ActionType,
            data: async () => {
              if (inputSchema) {
                await invokePromise(SpaceOperation.OpenCreateObject, {
                  target: db,
                  typename: managedCollection ? managedCollection.key : undefined,
                });
              } else {
                const createdObject = await runAndForwardErrors(createObject({}, { db, context }));
                const addResult = await invokePromise(SpaceOperation.AddObject, {
                  target: db,
                  hidden: true,
                  object: createdObject,
                });
                if (addResult.data?.id) {
                  await invokePromise(Common.LayoutOperation.Open, { subject: [addResult.data.id] });
                }
              }
            },
            properties: {
              label: ['create object in system collection label', { ns: meta.id }],
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.createObject',
            },
          },
        ]
      : []),
    ...(managedCollection
      ? []
      : [
          {
            id: getId(SpaceOperation.RenameObject.meta.key),
            type: Node.ActionType,
            data: async (params?: Node.InvokeProps) => {
              await invokePromise(SpaceOperation.RenameObject, { object, caller: params?.caller });
            },
            properties: {
              label: ['rename object label', { ns: typename }],
              icon: 'ph--pencil-simple-line--regular',
              disposition: 'list-item',
              // TODO(wittjosiah): Not working.
              // keyBinding: {
              //   macos: 'shift+F6',
              // },
              testId: 'spacePlugin.renameObject',
            },
          },
          {
            id: getId(SpaceOperation.RemoveObjects.meta.key),
            type: Node.ActionType,
            data: async () => {
              const collection = Graph.getConnections(graph, Obj.getDXN(object).toString(), 'inbound').find(
                (node: Node.Node): node is Node.Node<Collection.Collection> =>
                  Obj.instanceOf(Collection.Collection, node.data),
              )?.data;
              await invokePromise(SpaceOperation.RemoveObjects, { objects: [object], target: collection });
            },
            properties: {
              label: ['delete object label', { ns: typename }],
              icon: 'ph--trash--regular',
              disposition: 'list-item',
              disabled: !deletable,
              // TODO(wittjosiah): This is a browser shortcut.
              // keyBinding: object instanceof CollectionType ? undefined : 'shift+meta+Backspace',
              testId: 'spacePlugin.deleteObject',
            },
          },
        ]),
    ...(navigable ||
    (!Obj.instanceOf(Collection.Collection, object) &&
      !Obj.instanceOf(Collection.Managed, object) &&
      !Obj.instanceOf(Type.PersistentType, object))
      ? [
          {
            id: getId('copy-link'),
            type: Node.ActionType,
            data: async () => {
              const url = `${window.location.origin}/${db.spaceId}/${Obj.getDXN(object).toString()}`;
              await navigator.clipboard.writeText(url);
            },
            properties: {
              label: ['copy link label', { ns: meta.id }],
              icon: 'ph--link--regular',
              disposition: 'list-item',
              testId: 'spacePlugin.copyLink',
            },
          },
        ]
      : []),
    // TODO(wittjosiah): Factor out and apply to all nodes.
    {
      id: getId(Common.LayoutOperation.Expose.meta.key),
      type: Node.ActionType,
      data: async () => {
        await invokePromise(Common.LayoutOperation.Expose, { subject: Obj.getDXN(object).toString() });
      },
      properties: {
        label: ['expose object label', { ns: meta.id }],
        icon: 'ph--eye--regular',
        disposition: 'heading-list-item',
        testId: 'spacePlugin.exposeObject',
      },
    },
  ];

  return actions;
};

// TODO(wittjosiah): Factor out.
const downloadBlob = async (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * @deprecated This is a temporary solution.
 */
export const getNestedObjects = async (
  object: Obj.Any,
  resolve: (typename: string) => Record<string, any>,
): Promise<Obj.Any[]> => {
  const type = Obj.getTypename(object);
  if (!type) {
    return [];
  }

  const metadata = resolve(type);
  const loadReferences = metadata?.loadReferences;
  if (typeof loadReferences !== 'function') {
    return [];
  }

  const objects: Obj.Any[] = await loadReferences(object);
  const nested = await Promise.all(objects.map((object) => getNestedObjects(object, resolve)));
  return [...objects, ...nested.flat()];
};

/**
 * @deprecated Workaround for ECHO not supporting clone.
 */
// TODO(burdon): Remove.
export const cloneObject = async (
  object: Obj.Any,
  resolve: (typename: string) => Record<string, any>,
  newDb: Database.Database,
): Promise<Obj.Any> => {
  const schema = Obj.getSchema(object);
  const typename = schema ? (Type.getTypename(schema) ?? EXPANDO_TYPENAME) : EXPANDO_TYPENAME;
  const metadata = resolve(typename);
  const serializer = metadata.serializer;
  invariant(serializer, `No serializer for type: ${typename}`);
  const content = await serializer.serialize({ object });
  return serializer.deserialize({ content, db: newDb, newId: true });
};
