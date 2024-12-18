//
// Copyright 2023 DXOS.org
//

import { type IntentDispatcher, type MetadataResolver } from '@dxos/app-framework';
import { EXPANDO_TYPENAME, getObjectAnnotation, getTypename, type Expando } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { getSchema, isReactiveObject, makeRef } from '@dxos/live-object';
import { Migrations } from '@dxos/migrations';
import {
  ACTION_GROUP_TYPE,
  ACTION_TYPE,
  cleanup,
  getGraph,
  memoize,
  type ActionData,
  type Graph,
  type InvokeParams,
  type Node,
  type NodeArg,
} from '@dxos/plugin-graph';
import {
  Filter,
  fullyQualifiedId,
  getSpace,
  isSpace,
  SpaceState,
  type Echo,
  type FilterSource,
  type Query,
  type QueryOptions,
  type ReactiveEchoObject,
  type Space,
} from '@dxos/react-client/echo';

import { SPACE_PLUGIN, SpaceAction } from './meta';
import { CollectionType } from './types';

export const SPACES = `${SPACE_PLUGIN}-spaces`;
export const SPACE_TYPE = 'dxos.org/type/Space';
export const COMPOSER_SPACE_LOCK = 'dxos.org/plugin/space/lock';
// TODO(wittjosiah): Remove.
export const SHARED = 'shared-spaces';

const EMPTY_ARRAY: never[] = [];

/**
 *
 * @param spaceOrEcho
 * @param filter
 * @param options
 * @returns
 */
export const memoizeQuery = <T extends ReactiveEchoObject<any>>(
  spaceOrEcho?: Space | Echo,
  filter?: FilterSource<T>,
  options?: QueryOptions,
): T[] => {
  const key = JSON.stringify({
    space: isSpace(spaceOrEcho) ? spaceOrEcho.id : undefined,
    filter: Filter.from(filter).toProto(),
  });

  const query = memoize(
    () =>
      isSpace(spaceOrEcho)
        ? spaceOrEcho.db.query(filter, options)
        : (spaceOrEcho?.query(filter, options) as Query<T> | undefined),
    key,
  );
  const unsubscribe = memoize(() => query?.subscribe(), key);
  cleanup(() => unsubscribe?.());

  return query?.objects ?? EMPTY_ARRAY;
};

export const getSpaceDisplayName = (
  space: Space,
  { personal, namesCache = {} }: { personal?: boolean; namesCache?: Record<string, string> } = {},
): string | [string, { ns: string }] => {
  return space.state.get() === SpaceState.SPACE_READY && (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : namesCache[space.id]
      ? namesCache[space.id]
      : personal
        ? ['personal space label', { ns: SPACE_PLUGIN }]
        : ['unnamed space label', { ns: SPACE_PLUGIN }];
};

const getCollectionGraphNodePartials = ({
  navigable,
  collection,
  space,
  resolve,
}: {
  navigable: boolean;
  collection: CollectionType;
  space: Space;
  resolve: MetadataResolver;
}) => {
  return {
    disabled: !navigable,
    acceptPersistenceClass: new Set(['echo']),
    acceptPersistenceKey: new Set([space.id]),
    role: 'branch',
    onRearrangeChildren: (nextOrder: unknown[]) => {
      // Change on disk.
      collection.objects = nextOrder.map((object) => makeRef(object as Expando));
    },
    onTransferStart: (child: Node<ReactiveEchoObject<any>>, index?: number) => {
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
          collection.objects.splice(index, 0, makeRef(child.data));
        } else {
          collection.objects.push(makeRef(child.data));
        }
      }

      // }
    },
    onTransferEnd: (child: Node<ReactiveEchoObject<any>>, destination: Node) => {
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
    onCopy: async (child: Node<ReactiveEchoObject<any>>, index?: number) => {
      // Create clone of child and add to destination space.
      const newObject = await cloneObject(child.data, resolve, space);
      space.db.add(newObject);
      if (typeof index !== 'undefined') {
        collection.objects.splice(index, 0, makeRef(newObject));
      } else {
        collection.objects.push(makeRef(newObject));
      }
    },
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
  resolve: MetadataResolver;
}) => {
  const hasPendingMigration = checkPendingMigration(space);
  const collection = space.state.get() === SpaceState.SPACE_READY && space.properties[CollectionType.typename];
  const partials =
    space.state.get() === SpaceState.SPACE_READY && collection instanceof CollectionType
      ? getCollectionGraphNodePartials({ collection, space, resolve, navigable })
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
      icon: 'ph--planet--regular',
      disabled: !navigable || space.state.get() !== SpaceState.SPACE_READY || hasPendingMigration,
      testId: 'spacePlugin.space',
    },
  };
};

export const constructSpaceActions = ({
  space,
  dispatch,
  personal,
  migrating,
}: {
  space: Space;
  dispatch: IntentDispatcher;
  personal?: boolean;
  migrating?: boolean;
}) => {
  const state = space.state.get();
  const hasPendingMigration = checkPendingMigration(space);
  const getId = (id: string) => `${id}/${space.id}`;
  const actions: NodeArg<ActionData>[] = [];

  if (hasPendingMigration) {
    actions.push({
      id: getId(SpaceAction.MIGRATE),
      type: ACTION_GROUP_TYPE,
      data: async () => {
        await dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.MIGRATE, data: { space } });
      },
      properties: {
        label: ['migrate space label', { ns: SPACE_PLUGIN }],
        icon: 'ph--database--regular',
        disposition: 'toolbar',
        disabled: migrating || Migrations.running(space),
      },
    });
  }

  if (state === SpaceState.SPACE_READY && !hasPendingMigration) {
    const locked = space.properties[COMPOSER_SPACE_LOCK];
    actions.push(
      {
        id: getId(SpaceAction.OPEN_CREATE_OBJECT),
        type: ACTION_TYPE,
        data: async () => {
          await dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.OPEN_CREATE_OBJECT, data: { target: space } });
        },
        properties: {
          label: ['create object in space label', { ns: SPACE_PLUGIN }],
          icon: 'ph--plus--regular',
          disposition: 'toolbar',
          testId: 'spacePlugin.createObject',
        },
      },
      {
        id: getId(SpaceAction.SHARE),
        type: ACTION_TYPE,
        data: async () => {
          if (locked) {
            return;
          }
          await dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.SHARE, data: { space } });
        },
        properties: {
          label: ['share space label', { ns: SPACE_PLUGIN }],
          icon: 'ph--users--regular',
          disabled: locked,
          keyBinding: {
            macos: 'meta+.',
            windows: 'alt+.',
          },
        },
      },
      {
        id: locked ? getId(SpaceAction.UNLOCK) : getId(SpaceAction.LOCK),
        type: ACTION_TYPE,
        data: async () => {
          await dispatch({
            plugin: SPACE_PLUGIN,
            action: locked ? SpaceAction.UNLOCK : SpaceAction.LOCK,
            data: { space },
          });
        },
        properties: {
          label: [locked ? 'unlock space label' : 'lock space label', { ns: SPACE_PLUGIN }],
          icon: locked ? 'ph--lock-simple-open--regular' : 'ph--lock-simple--regular',
        },
      },
      {
        id: getId(SpaceAction.RENAME),
        type: ACTION_TYPE,
        data: async (params: InvokeParams) => {
          await dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.RENAME, data: { space, ...params } });
        },
        properties: {
          label: ['rename space label', { ns: SPACE_PLUGIN }],
          icon: 'ph--pencil-simple-line--regular',
          keyBinding: {
            macos: 'shift+F6',
            windows: 'shift+F6',
          },
        },
      },
      {
        id: getId(SpaceAction.OPEN_SETTINGS),
        type: ACTION_TYPE,
        data: async () => {
          await dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.OPEN_SETTINGS, data: { space } });
        },
        properties: {
          label: ['open space settings label', { ns: SPACE_PLUGIN }],
          icon: 'ph--gear--regular',
        },
      },
    );
  }

  // TODO(wittjosiah): Consider moving close space into the space settings dialog.
  if (state !== SpaceState.SPACE_INACTIVE && !hasPendingMigration) {
    actions.push({
      id: getId(SpaceAction.CLOSE),
      type: ACTION_TYPE,
      data: async () => {
        await dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.CLOSE, data: { space } });
      },
      properties: {
        label: ['close space label', { ns: SPACE_PLUGIN }],
        icon: 'ph--x--regular',
        disabled: personal,
      },
    });
  }

  if (state === SpaceState.SPACE_INACTIVE) {
    actions.push({
      id: getId(SpaceAction.OPEN),
      type: ACTION_TYPE,
      data: async () => {
        await dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.OPEN, data: { space } });
      },
      properties: {
        label: ['open space label', { ns: SPACE_PLUGIN }],
        icon: 'ph--clock-counter-clockwise--regular',
        disposition: 'toolbar',
      },
    });
  }

  return actions;
};

export const createObjectNode = ({
  object,
  space,
  navigable = false,
  resolve,
}: {
  object: ReactiveEchoObject<any>;
  space: Space;
  navigable?: boolean;
  resolve: MetadataResolver;
}) => {
  const type = getTypename(object);
  if (!type) {
    return undefined;
  }

  const metadata = resolve(type);
  if (Object.keys(metadata).length === 0) {
    return undefined;
  }

  const partials =
    object instanceof CollectionType
      ? getCollectionGraphNodePartials({ collection: object, space, resolve, navigable })
      : metadata.graphProps;

  return {
    id: fullyQualifiedId(object),
    type,
    cacheable: ['label', 'icon', 'role'],
    data: object,
    properties: {
      ...partials,
      label: metadata.label?.(object) ||
        object.name ||
        metadata.placeholder || ['unnamed object label', { ns: SPACE_PLUGIN }],
      icon: metadata.icon ?? 'ph--placeholder--regular',
      testId: 'spacePlugin.object',
      persistenceClass: 'echo',
      persistenceKey: space?.id,
    },
  };
};

export const constructObjectActions = ({
  node,
  dispatch,
}: {
  node: Node<ReactiveEchoObject<any>>;
  dispatch: IntentDispatcher;
}) => {
  const object = node.data;
  const getId = (id: string) => `${id}/${fullyQualifiedId(object)}`;
  const actions: NodeArg<ActionData>[] = [
    ...(object instanceof CollectionType
      ? [
          {
            id: getId(SpaceAction.ADD_OBJECT),
            type: ACTION_TYPE,
            data: async () => {
              await dispatch({
                plugin: SPACE_PLUGIN,
                action: SpaceAction.OPEN_CREATE_OBJECT,
                data: { target: object },
              });
            },
            properties: {
              label: ['create object in collection label', { ns: SPACE_PLUGIN }],
              icon: 'ph--plus--regular',
              disposition: 'toolbar',
              testId: 'spacePlugin.createObject',
            },
          },
        ]
      : []),
    {
      id: getId(SpaceAction.RENAME_OBJECT),
      type: ACTION_TYPE,
      data: async (params: InvokeParams) => {
        await dispatch({
          action: SpaceAction.RENAME_OBJECT,
          data: { object, ...params },
        });
      },
      properties: {
        label: [
          object instanceof CollectionType ? 'rename collection label' : 'rename object label',
          { ns: SPACE_PLUGIN },
        ],
        icon: 'ph--pencil-simple-line--regular',
        // TODO(wittjosiah): Doesn't work.
        // keyBinding: 'shift+F6',
        testId: 'spacePlugin.renameObject',
      },
    },
    {
      id: getId(SpaceAction.REMOVE_OBJECTS),
      type: ACTION_TYPE,
      data: async () => {
        const graph = getGraph(node);
        const collection = graph
          .nodes(node, { relation: 'inbound' })
          .find(({ data }) => data instanceof CollectionType)?.data;
        await dispatch([
          {
            action: SpaceAction.REMOVE_OBJECTS,
            data: { objects: [object], collection },
          },
        ]);
      },
      properties: {
        label: [
          object instanceof CollectionType ? 'delete collection label' : 'delete object label',
          { ns: SPACE_PLUGIN },
        ],
        icon: 'ph--trash--regular',
        keyBinding: object instanceof CollectionType ? undefined : 'shift+meta+Backspace',
        testId: 'spacePlugin.deleteObject',
      },
    },
    {
      id: getId('copy-link'),
      type: ACTION_TYPE,
      data: async () => {
        const url = `${window.location.origin}/${fullyQualifiedId(object)}`;
        await navigator.clipboard.writeText(url);
      },
      properties: {
        label: ['copy link label', { ns: SPACE_PLUGIN }],
        icon: 'ph--link--regular',
        testId: 'spacePlugin.copyLink',
      },
    },
  ];

  return actions;
};

/**
 * @deprecated
 */
export const getActiveSpace = (graph: Graph, active?: string) => {
  if (!active) {
    return;
  }

  const node = graph.findNode(active);
  if (!node || !isReactiveObject(node.data)) {
    return;
  }

  return getSpace(node.data);
};

/**
 * @deprecated This is a temporary solution.
 */
export const getNestedObjects = async (
  object: ReactiveEchoObject<any>,
  resolve: MetadataResolver,
): Promise<ReactiveEchoObject<any>[]> => {
  const type = getTypename(object);
  if (!type) {
    return [];
  }

  const metadata = resolve(type);
  const loadReferences = metadata.loadReferences;
  if (typeof loadReferences !== 'function') {
    return [];
  }

  const objects: ReactiveEchoObject<any>[] = await loadReferences(object);
  const nested = await Promise.all(objects.map((object) => getNestedObjects(object, resolve)));
  return [...objects, ...nested.flat()];
};

/**
 * @deprecated Workaround for ECHO not supporting clone.
 */
// TODO(burdon): Remove.
export const cloneObject = async (object: Expando, resolve: MetadataResolver, newSpace: Space): Promise<Expando> => {
  const schema = getSchema(object);
  const typename = schema ? getObjectAnnotation(schema)?.typename ?? EXPANDO_TYPENAME : EXPANDO_TYPENAME;
  const metadata = resolve(typename);
  const serializer = metadata.serializer;
  invariant(serializer, `No serializer for type: ${typename}`);
  const content = await serializer.serialize({ object });
  return serializer.deserialize({ content, space: newSpace, newId: true });
};
