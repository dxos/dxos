//
// Copyright 2023 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import * as Effect from 'effect/Effect';

import { type CapabilityManager } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type Space, SpaceState, isSpace } from '@dxos/client/echo';
import { type Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Migrations } from '@dxos/migrations';
import { Operation } from '@dxos/operation';
import { Graph, Node } from '@dxos/plugin-graph';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention/types';
import { type TreeData } from '@dxos/react-ui-list';
import { Collection, Expando } from '@dxos/schema';
import { type Label } from '@dxos/ui-types';
import { createFilename } from '@dxos/util';

import { meta } from './meta';
import { SPACE_TYPE, SpaceOperation } from './types';

//
// Constants
//

const CACHEABLE_PROPS: string[] = ['label', 'icon', 'role'];
const ACCEPT_ECHO_CLASS: Set<string> = new Set(['echo']);

/** Shared translation namespace descriptor. */
const META_NS: { ns: string } = { ns: meta.id };

/** Static label tuples (translation key + namespace). */
const PERSONAL_SPACE_LABEL: Label = ['personal space label', META_NS];
const UNNAMED_SPACE_LABEL: Label = ['unnamed space label', META_NS];
const SETTINGS_PANEL_LABEL: Label = ['settings panel label', META_NS];
const SPACE_SETTINGS_PROPERTIES_LABEL: Label = ['space settings properties label', META_NS];
const MEMBERS_PANEL_LABEL: Label = ['members panel label', META_NS];
const SPACE_SETTINGS_SCHEMA_LABEL: Label = ['space settings schema label', META_NS];
const MIGRATE_SPACE_LABEL: Label = ['migrate space label', META_NS];
const CREATE_OBJECT_IN_SPACE_LABEL: Label = ['create object in space label', META_NS];
const RENAME_SPACE_LABEL: Label = ['rename space label', META_NS];
const ADD_VIEW_TO_SCHEMA_LABEL: Label = ['add view to schema label', META_NS];
const SNAPSHOT_BY_SCHEMA_LABEL: Label = ['snapshot by schema label', META_NS];
const CREATE_OBJECT_IN_COLLECTION_LABEL: Label = ['create object in collection label', META_NS];
const CREATE_OBJECT_IN_SYSTEM_COLLECTION_LABEL: Label = ['create object in system collection label', META_NS];
const COPY_LINK_LABEL: Label = ['copy link label', META_NS];
const EXPOSE_OBJECT_LABEL: Label = ['expose object label', META_NS];

/** Stable callback constants (no closed-over state). */
const CAN_DROP_FALSE = () => false;
const CAN_DROP_SPACE = (source: TreeData) => Obj.isObject(source.item.data) || isSpace(source.item.data);
const CAN_DROP_OBJECT = (source: TreeData) => Node.isGraphNode(source.item) && Obj.isObject(source.item.data);
const CAN_DROP_OBJECT_DISABLED = () => false;

export const SPACES = `${meta.id}-spaces`;
export const COMPOSER_SPACE_LOCK = `${meta.id}/lock`;
// TODO(wittjosiah): Remove.
export const SHARED = 'shared-spaces';

const SCHEMA_GRAPH_NODE_PARTIALS = {
  role: 'branch',
  canDrop: CAN_DROP_FALSE,
} as const;

const getSchemaGraphNodePartials = () => SCHEMA_GRAPH_NODE_PARTIALS;

//
// Caching Infrastructure
//

/** Creates a string-keyed memoized factory. Returns the same instance for the same key. */
// TODO(wittjosiah): Factor out as app-graph utility.
function createFactory<T>(create: (key: string) => T): (key: string) => T;
function createFactory<TArgs extends any[], T>(
  create: (...args: TArgs) => T,
  keyFn: (...args: TArgs) => string,
): (...args: TArgs) => T;
function createFactory<TArgs extends any[], T>(
  create: (...args: TArgs) => T,
  keyFn?: (...args: TArgs) => string,
): (...args: TArgs) => T {
  const cache = new Map<string, T>();
  return (...args: TArgs) => {
    const key = keyFn ? keyFn(...args) : (args[0] as string);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const value = create(...args);
    cache.set(key, value);
    return value;
  };
}

/** Dynamic label tuples keyed by composite key string. */
const getDynamicLabel = createFactory(
  (key: string, ns: string, extra?: Record<string, any>): Label => [key, { ns, ...extra }],
  (key: string, ns: string, extra?: Record<string, any>) => `${key}\0${ns}${extra ? `\0${JSON.stringify(extra)}` : ''}`,
);

/** Stable Set instances keyed by spaceId. */
const getAcceptPersistenceKey = createFactory((spaceId: string) => new Set([spaceId]));

/** Caches for closures that capture ECHO objects, keyed by DXN/ID string. */
const rearrangeCache = new Map<string, (nextOrder: unknown[]) => void>();
const blockInstructionCache = new Map<string, (source: TreeData, instruction: Instruction) => boolean>();
const spaceRearrangeCache = new Map<string, (nextOrder: Space[]) => void>();
const collectionPartialsCache = new Map<string, ReturnType<typeof buildCollectionPartials>>();
const spaceActionsCache = new Map<
  string,
  {
    state: SpaceState;
    hasPendingMigration: boolean;
    migrating: boolean;
    actions: Node.NodeArg<Node.ActionData<Operation.Service>>[];
  }
>();

//
// Node Constructors
//

export const constructSpaceNode = ({
  space,
  navigable = false,
  personal,
  namesCache,
  resolve,
  graph,
  spacesOrder,
}: {
  space: Space;
  navigable?: boolean;
  personal?: boolean;
  namesCache?: Record<string, string>;
  resolve: (typename: string) => Record<string, any>;
  /** Graph for sorting edges on rearrange. */
  graph?: Graph.ExpandableGraph;
  // TODO(wittjosiah): Should be Type.Expando but it doesn't work with the AtomQuery result type.
  /** Spaces order object for persisting workspace order. */
  spacesOrder?: Obj.Any;
}) => {
  const hasPendingMigration = checkPendingMigration(space);
  const collection =
    space.state.get() === SpaceState.SPACE_READY && space.properties[Collection.Collection.typename]?.target;
  const partials =
    space.state.get() === SpaceState.SPACE_READY && Obj.instanceOf(Collection.Collection, collection)
      ? getCollectionGraphNodePartials({ collection, db: space.db, resolve })
      : {};

  let onRearrange: ((nextOrder: Space[]) => void) | undefined;
  if (graph && spacesOrder) {
    onRearrange = spaceRearrangeCache.get(space.id);
    if (!onRearrange) {
      onRearrange = (nextOrder: Space[]) => {
        // NOTE: This is needed to ensure order is updated by next animation frame.
        Graph.sortEdges(
          graph,
          Node.RootId,
          'outbound',
          nextOrder.map(({ id }) => id),
        );

        // Persist order to database.
        Obj.change(spacesOrder, (mutableOrder: any) => {
          mutableOrder.order = nextOrder.map(({ id }) => id);
        });
      };
      spaceRearrangeCache.set(space.id, onRearrange);
    }
  }

  return {
    id: space.id,
    type: SPACE_TYPE,
    cacheable: CACHEABLE_PROPS,
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
      disposition: 'workspace',
      testId: 'spacePlugin.space',
      onRearrange,
      // TODO(wittjosiah): Find a way to only allow space as source for rearranging.
      canDrop: CAN_DROP_SPACE,
    },
    nodes: [
      {
        id: `settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`,
        type: `${meta.id}/settings`,
        data: null,
        properties: {
          label: SETTINGS_PANEL_LABEL,
          icon: 'ph--faders--regular',
          disposition: 'alternate-tree',
        },
        nodes: [
          {
            id: `properties-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`,
            type: `${meta.id}/properties`,
            data: `${meta.id}/properties`,
            properties: {
              label: SPACE_SETTINGS_PROPERTIES_LABEL,
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
              label: MEMBERS_PANEL_LABEL,
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
              label: SPACE_SETTINGS_SCHEMA_LABEL,
              icon: 'ph--shapes--regular',
              testId: 'spacePlugin.schema',
            },
          },
        ],
      },
    ],
  };
};

export const createObjectNode = ({
  db,
  object,
  disposition,
  droppable = true,
  navigable = false,
  managedCollectionChild = false,
  resolve,
  parentCollection,
}: {
  db: Database.Database;
  object: Obj.Unknown;
  disposition?: string;
  droppable?: boolean;
  navigable?: boolean;
  managedCollectionChild?: boolean;
  resolve: (typename: string) => Record<string, any>;
  /** Parent collection for rearranging objects. */
  parentCollection?: Collection.Collection;
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
  const label =
    (object as any).name ||
    Obj.getLabel(object) ||
    // TODO(wittjosiah): Remove metadata labels.
    metadata.label?.(object) ||
    getDynamicLabel('object name placeholder', type, { default: 'New item' });

  const selectable =
    (!Obj.instanceOf(Type.PersistentType, object) &&
      !Obj.instanceOf(Collection.Managed, object) &&
      !Obj.instanceOf(Collection.Collection, object)) ||
    (navigable && Obj.instanceOf(Collection.Collection, object));

  let onRearrange: ((nextOrder: unknown[]) => void) | undefined;
  if (parentCollection) {
    const collectionId = Obj.getDXN(parentCollection).toString();
    onRearrange = rearrangeCache.get(collectionId);
    if (!onRearrange) {
      onRearrange = (nextOrder: unknown[]) => {
        Obj.change(parentCollection, (c) => {
          c.objects = nextOrder.filter(Obj.isObject).map(Ref.make);
        });
      };
      rearrangeCache.set(collectionId, onRearrange);
    }
  }

  const objectId = Obj.getDXN(object).toString();
  const blockInstructionKey = `${objectId}:${managedCollectionChild}`;
  let blockInstruction = blockInstructionCache.get(blockInstructionKey);
  if (!blockInstruction) {
    blockInstruction = (source: TreeData, instruction: Instruction) => {
      if (source.item.properties.managedCollectionChild) {
        return true;
      }
      if (Obj.instanceOf(Collection.Managed, object)) {
        return !instruction.type.startsWith('reorder');
      }
      return managedCollectionChild;
    };
    blockInstructionCache.set(blockInstructionKey, blockInstruction);
  }

  const canDrop = droppable ? CAN_DROP_OBJECT : CAN_DROP_OBJECT_DISABLED;

  return {
    id: Obj.getDXN(object).toString(),
    type,
    cacheable: CACHEABLE_PROPS,
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
      onRearrange,
      blockInstruction,
      canDrop,
      ...partials,
    },
  };
};

export const createStaticSchemaNode = ({ schema, space }: { schema: Type.Entity.Any; space: Space }): Node.Node => {
  return {
    id: `${space.id}/${Type.getTypename(schema)}`,
    type: `${meta.id}/static-schema`,
    data: schema,
    properties: {
      label: getDynamicLabel('typename label', Type.getTypename(schema), {
        count: 2,
        default: Type.getTypename(schema),
      }),
      icon: 'ph--database--regular',
      iconHue: 'green',
      role: 'branch',
      selectable: false,
      canDrop: CAN_DROP_FALSE,
      space,
    },
  };
};

//
// Action Constructors
//

export const constructSpaceActions = ({
  space,
  personal,
  migrating,
}: {
  space: Space;
  personal?: boolean;
  migrating?: boolean;
}) => {
  const state = space.state.get();
  const hasPendingMigration = checkPendingMigration(space);
  const isMigrating = migrating || Migrations.running(space);

  const cached = spaceActionsCache.get(space.id);
  if (
    cached &&
    cached.state === state &&
    cached.hasPendingMigration === hasPendingMigration &&
    cached.migrating === isMigrating
  ) {
    return cached.actions;
  }

  const getId = (id: string) => `${id}/${space.id}`;
  const actions: Node.NodeArg<Node.ActionData<Operation.Service>>[] = [];

  if (hasPendingMigration) {
    actions.push({
      id: getId(SpaceOperation.Migrate.meta.key),
      type: Node.ActionGroupType,
      data: () => Operation.invoke(SpaceOperation.Migrate, { space }),
      properties: {
        label: MIGRATE_SPACE_LABEL,
        icon: 'ph--database--regular',
        disposition: 'list-item-primary',
        disabled: isMigrating,
      },
    });
  }

  if (state === SpaceState.SPACE_READY && !hasPendingMigration) {
    actions.push(
      {
        id: getId(SpaceOperation.OpenCreateObject.meta.key),
        type: Node.ActionType,
        data: () => Operation.invoke(SpaceOperation.OpenCreateObject, { target: space.db }),
        properties: {
          label: CREATE_OBJECT_IN_SPACE_LABEL,
          icon: 'ph--plus--regular',
          disposition: 'list-item-primary',
          testId: 'spacePlugin.createObject',
        },
      },
      {
        id: getId(SpaceOperation.Rename.meta.key),
        type: Node.ActionType,
        data: (params?: Node.InvokeProps) => Operation.invoke(SpaceOperation.Rename, { space, caller: params?.caller }),
        properties: {
          label: RENAME_SPACE_LABEL,
          icon: 'ph--pencil-simple-line--regular',
          keyBinding: {
            macos: 'shift+F6',
            windows: 'shift+F6',
          },
        },
      },
    );
  }

  spaceActionsCache.set(space.id, { state, hasPendingMigration, migrating: isMigrating, actions });
  return actions;
};

export const createStaticSchemaActions = ({
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
            Obj.change(space.properties, (p) => {
              p.staticRecords.splice(index, 1);
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

export const constructObjectActions = ({
  object,
  graph,
  resolve,
  capabilities,
  deletable = true,
  navigable = false,
  shareableLinkOrigin,
}: {
  object: Obj.Unknown;
  graph: Graph.ReadableGraph;
  resolve: (typename: string) => Record<string, any>;
  capabilities: CapabilityManager.CapabilityManager;
  shareableLinkOrigin: string;
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

  const actions: Node.NodeArg<Node.ActionData<Operation.Service>>[] = [
    ...(Obj.instanceOf(Collection.Collection, object)
      ? [
          {
            id: getId(SpaceOperation.OpenCreateObject.meta.key),
            type: Node.ActionType,
            data: () => Operation.invoke(SpaceOperation.OpenCreateObject, { target: object }),
            properties: {
              label: CREATE_OBJECT_IN_COLLECTION_LABEL,
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
            data: () =>
              Operation.invoke(SpaceOperation.OpenCreateObject, {
                target: db,
                views: true,
                initialFormValues: { typename: object.typename },
              }),
            properties: {
              label: ADD_VIEW_TO_SCHEMA_LABEL,
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.addViewToSchema',
            },
          },
          {
            id: getId(SpaceOperation.Snapshot.meta.key),
            type: Node.ActionType,
            data: Effect.fnUntraced(function* () {
              const result = yield* Operation.invoke(SpaceOperation.Snapshot, {
                db,
                query: Query.select(Filter.type(Type.toEffectSchema(object.jsonSchema))).ast,
              });
              if (result.snapshot) {
                yield* Effect.promise(() =>
                  downloadBlob(result.snapshot, createFilename({ parts: [db.spaceId, object.typename], ext: 'json' })),
                );
              }
            }),
            properties: {
              label: SNAPSHOT_BY_SCHEMA_LABEL,
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
            data: Effect.fnUntraced(function* () {
              if (inputSchema) {
                yield* Operation.invoke(SpaceOperation.OpenCreateObject, {
                  target: db,
                  typename: managedCollection ? managedCollection.key : undefined,
                });
              } else {
                const createdObject = yield* createObject({}, { db, capabilities }) as Effect.Effect<
                  Obj.Unknown,
                  Error,
                  never
                >;
                const addResult = yield* Operation.invoke(SpaceOperation.AddObject, {
                  target: db,
                  hidden: true,
                  object: createdObject,
                });
                if (addResult.id) {
                  yield* Operation.invoke(LayoutOperation.Open, { subject: [addResult.id] });
                }
              }
            }),
            properties: {
              label: CREATE_OBJECT_IN_SYSTEM_COLLECTION_LABEL,
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
            data: (params?: Node.InvokeProps) =>
              Operation.invoke(SpaceOperation.RenameObject, { object, caller: params?.caller }),
            properties: {
              label: getDynamicLabel('rename object label', typename),
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
            data: Effect.fnUntraced(function* () {
              const collection = Graph.getConnections(graph, Obj.getDXN(object).toString(), 'inbound').find(
                (node: Node.Node): node is Node.Node<Collection.Collection> =>
                  Obj.instanceOf(Collection.Collection, node.data),
              )?.data;
              yield* Operation.invoke(SpaceOperation.RemoveObjects, { objects: [object], target: collection });
            }),
            properties: {
              label: getDynamicLabel('delete object label', typename),
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
            data: () =>
              Effect.promise(async () => {
                const url = `${shareableLinkOrigin}/${db.spaceId}/${Obj.getDXN(object).toString()}`;
                await navigator.clipboard.writeText(url);
              }),
            properties: {
              label: COPY_LINK_LABEL,
              icon: 'ph--link--regular',
              disposition: 'list-item',
              testId: 'spacePlugin.copyLink',
            },
          },
        ]
      : []),
    // TODO(wittjosiah): Factor out and apply to all nodes.
    {
      id: getId(LayoutOperation.Expose.meta.key),
      type: Node.ActionType,
      data: () => Operation.invoke(LayoutOperation.Expose, { subject: Obj.getDXN(object).toString() }),
      properties: {
        label: EXPOSE_OBJECT_LABEL,
        icon: 'ph--eye--regular',
        disposition: 'heading-list-item',
        testId: 'spacePlugin.exposeObject',
      },
    },
  ];

  return actions;
};

//
// Helpers
//

const checkPendingMigration = (space: Space) => {
  return (
    space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION ||
    (space.state.get() === SpaceState.SPACE_READY &&
      !!Migrations.versionProperty &&
      space.properties[Migrations.versionProperty] !== Migrations.targetVersion)
  );
};

// TODO(wittjosiah): Factor out? Expose via capability?
export const getSpaceDisplayName = (
  space: Space,
  { personal, namesCache = {} }: { personal?: boolean; namesCache?: Record<string, string> } = {},
): Label => {
  return space.state.get() === SpaceState.SPACE_READY && (space.properties.name?.length ?? 0) > 0
    ? space.properties.name!
    : namesCache[space.id]
      ? namesCache[space.id]
      : personal
        ? PERSONAL_SPACE_LABEL
        : UNNAMED_SPACE_LABEL;
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

const buildCollectionPartials = (
  collection: Collection.Collection,
  db: Database.Database,
  resolve: (typename: string) => Record<string, any>,
) => ({
  acceptPersistenceClass: ACCEPT_ECHO_CLASS,
  acceptPersistenceKey: getAcceptPersistenceKey(db.spaceId),
  role: 'branch' as const,
  onTransferStart: (child: Node.Node<Obj.Unknown>, index?: number) => {
    Obj.change(collection, (c) => {
      if (!c.objects.find((object) => object.target === child.data)) {
        if (typeof index !== 'undefined') {
          c.objects.splice(index, 0, Ref.make(child.data));
        } else {
          c.objects.push(Ref.make(child.data));
        }
      }
    });
  },
  onTransferEnd: (child: Node.Node<Obj.Unknown>, _destination: Node.Node) => {
    Obj.change(collection, (c) => {
      const index = c.objects.findIndex((object) => object.target === child.data);
      if (index > -1) {
        c.objects.splice(index, 1);
      }
    });
  },
  onCopy: async (child: Node.Node<Obj.Unknown>, index?: number) => {
    const newObject = await cloneObject(child.data, resolve, db);
    db.add(newObject);
    Obj.change(collection, (c) => {
      if (typeof index !== 'undefined') {
        c.objects.splice(index, 0, Ref.make(newObject));
      } else {
        c.objects.push(Ref.make(newObject));
      }
    });
  },
});

const getCollectionGraphNodePartials = ({
  collection,
  db,
  resolve,
}: {
  collection: Collection.Collection;
  db: Database.Database;
  resolve: (typename: string) => Record<string, any>;
}) => {
  const id = Obj.getDXN(collection).toString();
  let cached = collectionPartialsCache.get(id);
  if (!cached) {
    cached = buildCollectionPartials(collection, db, resolve);
    collectionPartialsCache.set(id, cached);
  }
  return cached;
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
    label: getDynamicLabel('typename label', collection.key, { count: 2 }),
    icon: metadata.icon,
    iconHue: metadata.iconHue,
    acceptPersistenceClass: ACCEPT_ECHO_CLASS,
    acceptPersistenceKey: getAcceptPersistenceKey(db.spaceId),
    role: 'branch',
  };
};

//
// Deprecated
//

/**
 * @deprecated This is a temporary solution.
 */
export const getNestedObjects = async (
  object: Obj.Unknown,
  resolve: (typename: string) => Record<string, any>,
): Promise<Obj.Unknown[]> => {
  const type = Obj.getTypename(object);
  if (!type) {
    return [];
  }

  const metadata = resolve(type);
  const loadReferences = metadata?.loadReferences;
  if (typeof loadReferences !== 'function') {
    return [];
  }

  const objects: Obj.Unknown[] = await loadReferences(object);
  const nested = await Promise.all(objects.map((object) => getNestedObjects(object, resolve)));
  return [...objects, ...nested.flat()];
};

/**
 * @deprecated Workaround for ECHO not supporting clone.
 */
// TODO(burdon): Remove.
export const cloneObject = async (
  object: Obj.Unknown,
  resolve: (typename: string) => Record<string, any>,
  newDb: Database.Database,
): Promise<Obj.Unknown> => {
  const schema = Obj.getSchema(object);
  const typename = schema ? (Type.getTypename(schema) ?? Expando.Expando.typename) : Expando.Expando.typename;
  const metadata = resolve(typename);
  const serializer = metadata.serializer;
  invariant(serializer, `No serializer for type: ${typename}`);
  const content = await serializer.serialize({ object });
  return serializer.deserialize({ content, db: newDb, newId: true });
};
