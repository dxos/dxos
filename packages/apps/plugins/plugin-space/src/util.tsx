//
// Copyright 2023 DXOS.org
//

import {
  CardsThree,
  Database,
  FloppyDisk,
  FolderOpen,
  PencilSimpleLine,
  Planet,
  Plus,
  Trash,
  Users,
  X,
  ClockCounterClockwise,
  type IconProps,
  LockSimpleOpen,
  LockSimple,
  Placeholder,
} from '@phosphor-icons/react';
import React from 'react';

import {
  ACTION_TYPE,
  ACTION_GROUP_TYPE,
  actionGroupSymbol,
  type ActionData,
  type Graph,
  type Node,
  type InvokeParams,
  type NodeArg,
  getGraph,
  cleanup,
  memoize,
} from '@braneframe/plugin-graph';
import { CollectionType, cloneObject } from '@braneframe/types';
import { type MetadataResolver, NavigationAction, type IntentDispatcher } from '@dxos/app-framework';
import { type EchoReactiveObject, create, isReactiveObject, getTypename } from '@dxos/echo-schema';
import { Migrations } from '@dxos/migrations';
import {
  SpaceState,
  fullyQualifiedId,
  getSpace,
  isEchoObject,
  isSpace,
  type Echo,
  type FilterSource,
  type Query,
  type QueryOptions,
  type Space,
} from '@dxos/react-client/echo';

import { SpaceAction, SPACE_PLUGIN } from './meta';

export const SPACES = `${SPACE_PLUGIN}-spaces`;
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
export const memoizeQuery = <T extends EchoReactiveObject<any>>(
  spaceOrEcho?: Space | Echo,
  filter?: FilterSource<T>,
  options?: QueryOptions,
): T[] => {
  const key = isSpace(spaceOrEcho) ? spaceOrEcho.id : undefined;
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

const getCollectionGraphNodePartials = ({ collection, space }: { collection: CollectionType; space: Space }) => {
  return {
    acceptPersistenceClass: new Set(['echo']),
    acceptPersistenceKey: new Set([space.id]),
    role: 'branch',
    onRearrangeChildren: (nextOrder: unknown[]) => {
      // Change on disk.
      collection.objects = nextOrder.filter(isEchoObject);
    },
    onTransferStart: (child: Node<EchoReactiveObject<any>>) => {
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
      if (!collection.objects.includes(child.data)) {
        collection.objects.push(child.data);
      }

      // }
    },
    onTransferEnd: (child: Node<EchoReactiveObject<any>>, destination: Node) => {
      // Remove child from origin collection.
      const index = collection.objects.indexOf(child.data);
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
    onCopy: async (child: Node<EchoReactiveObject<any>>) => {
      // Create clone of child and add to destination space.
      const newObject = await cloneObject(child.data);
      space.db.add(newObject);
      collection.objects.push(newObject);
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
  personal,
  namesCache,
}: {
  space: Space;
  personal?: boolean;
  namesCache?: Record<string, string>;
}) => {
  const hasPendingMigration = checkPendingMigration(space);
  const collection = space.state.get() === SpaceState.SPACE_READY && space.properties[CollectionType.typename];
  const partials =
    space.state.get() === SpaceState.SPACE_READY && collection instanceof CollectionType
      ? getCollectionGraphNodePartials({ collection, space })
      : {};

  return {
    id: space.id,
    type: 'dxos.org/type/Space',
    data: space,
    properties: {
      ...partials,
      label: getSpaceDisplayName(space, { personal, namesCache }),
      description: space.state.get() === SpaceState.SPACE_READY && space.properties.description,
      icon: (props: IconProps) => <Planet {...props} />,
      disabled: space.state.get() !== SpaceState.SPACE_READY || hasPendingMigration,
      testId: 'spacePlugin.space',
    },
  };
};

export const constructSpaceActionGroups = ({ space, dispatch }: { space: Space; dispatch: IntentDispatcher }) => {
  const state = space.state.get();
  const hasPendingMigration = checkPendingMigration(space);
  const getId = (id: string) => `${id}/${space.id}`;

  if (state !== SpaceState.SPACE_READY || hasPendingMigration) {
    return [];
  }

  const collection = space.properties[CollectionType.typename];
  const actions: NodeArg<typeof actionGroupSymbol>[] = [
    {
      id: getId(SpaceAction.ADD_OBJECT),
      type: ACTION_GROUP_TYPE,
      data: actionGroupSymbol,
      properties: {
        label: ['create object in space label', { ns: SPACE_PLUGIN }],
        icon: (props: IconProps) => <Plus {...props} />,
        disposition: 'toolbar',
        // TODO(wittjosiah): This is currently a navtree feature. Address this with cmd+k integration.
        // mainAreaDisposition: 'in-flow',
        menuType: 'searchList',
        testId: 'spacePlugin.createObject',
      },
      nodes: [
        {
          id: getId(SpaceAction.ADD_OBJECT.replace('object', 'collection')),
          type: ACTION_TYPE,
          data: () =>
            dispatch([
              {
                plugin: SPACE_PLUGIN,
                action: SpaceAction.ADD_OBJECT,
                data: { target: collection, object: create(CollectionType, { objects: [], views: {} }) },
              },
              {
                action: NavigationAction.OPEN,
              },
            ]),
          properties: {
            label: ['create collection label', { ns: SPACE_PLUGIN }],
            icon: (props: IconProps) => <CardsThree {...props} />,
            testId: 'spacePlugin.createCollection',
          },
        },
      ],
    },
  ];

  return actions;
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
        icon: (props: IconProps) => <Database {...props} />,
        disposition: 'toolbar',
        mainAreaDisposition: 'in-flow',
        disabled: migrating || Migrations.running(space),
      },
    });
  }

  if (state === SpaceState.SPACE_READY && !hasPendingMigration) {
    const locked = space.properties[COMPOSER_SPACE_LOCK];
    actions.push(
      {
        id: getId(SpaceAction.SHARE),
        type: ACTION_TYPE,
        data: async () => {
          if (locked) {
            return;
          }
          await dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.SHARE, data: { spaceId: space.id } });
        },
        properties: {
          label: ['share space label', { ns: SPACE_PLUGIN }],
          icon: (props: IconProps) => <Users {...props} />,
          disabled: locked,
          keyBinding: {
            macos: 'meta+.',
            windows: 'alt+.',
          },
          mainAreaDisposition: 'absent',
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
          icon: locked
            ? (props: IconProps) => <LockSimpleOpen {...props} />
            : (props: IconProps) => <LockSimple {...props} />,
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
          icon: (props: IconProps) => <PencilSimpleLine {...props} />,
          keyBinding: {
            macos: 'shift+F6',
            windows: 'shift+F6',
          },
          mainAreaDisposition: 'absent',
        },
      },
      {
        id: getId(SpaceAction.SAVE),
        type: ACTION_TYPE,
        data: async () => {
          await dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.SAVE, data: { space } });
        },
        properties: {
          label: ['save space to disk label', { ns: SPACE_PLUGIN }],
          icon: (props: IconProps) => <FloppyDisk {...props} />,
          keyBinding: {
            macos: 'meta+s',
            windows: 'ctrl+s',
          },
          mainAreaDisposition: 'in-flow',
        },
      },
      {
        id: getId(SpaceAction.LOAD),
        type: ACTION_TYPE,
        data: async () => {
          await dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.LOAD, data: { space } });
        },
        properties: {
          label: ['load space from disk label', { ns: SPACE_PLUGIN }],
          icon: (props: IconProps) => <FolderOpen {...props} />,
          keyBinding: {
            macos: 'meta+shift+l',
            windows: 'ctrl+shift+l',
          },
          mainAreaDisposition: 'in-flow',
        },
      },
    );
  }

  if (state !== SpaceState.SPACE_INACTIVE && !hasPendingMigration) {
    actions.push({
      id: getId(SpaceAction.CLOSE),
      type: ACTION_TYPE,
      data: async () => {
        await dispatch({ plugin: SPACE_PLUGIN, action: SpaceAction.CLOSE, data: { space } });
      },
      properties: {
        label: ['close space label', { ns: SPACE_PLUGIN }],
        icon: (props: IconProps) => <X {...props} />,
        mainAreaDisposition: 'menu',
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
        icon: (props: IconProps) => <ClockCounterClockwise {...props} />,
        disposition: 'toolbar',
        mainAreaDisposition: 'in-flow',
      },
    });
  }

  return actions;
};

export const createObjectNode = ({
  object,
  space,
  resolve,
}: {
  object: EchoReactiveObject<any>;
  space: Space;
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
      ? getCollectionGraphNodePartials({ collection: object, space })
      : metadata.graphProps;

  return {
    id: fullyQualifiedId(object),
    type,
    data: object,
    properties: {
      ...partials,
      label: metadata.label?.(object) ||
        object.name ||
        metadata.placeholder || ['unnamed object label', { ns: SPACE_PLUGIN }],
      icon: metadata.icon ?? (() => <Placeholder />),
      testId: 'spacePlugin.object',
      persistenceClass: 'echo',
      persistenceKey: space?.id,
    },
  };
};

export const constructObjectActionGroups = ({
  object,
  dispatch,
}: {
  object: EchoReactiveObject<any>;
  dispatch: IntentDispatcher;
}) => {
  if (!(object instanceof CollectionType)) {
    return [];
  }

  const collection = object;
  const getId = (id: string) => `${id}/${fullyQualifiedId(object)}`;
  const actions: NodeArg<typeof actionGroupSymbol>[] = [
    {
      id: getId(SpaceAction.ADD_OBJECT),
      type: ACTION_GROUP_TYPE,
      data: actionGroupSymbol,
      properties: {
        label: ['create object in collection label', { ns: SPACE_PLUGIN }],
        icon: (props: IconProps) => <Plus {...props} />,
        disposition: 'toolbar',
        // TODO(wittjosiah): This is currently a navtree feature. Address this with cmd+k integration.
        // mainAreaDisposition: 'in-flow',
        menuType: 'searchList',
        testId: 'spacePlugin.createObject',
      },
      nodes: [
        {
          id: getId(SpaceAction.ADD_OBJECT.replace('object', 'collection')),
          type: ACTION_TYPE,
          data: () =>
            dispatch([
              {
                plugin: SPACE_PLUGIN,
                action: SpaceAction.ADD_OBJECT,
                data: { target: collection, object: create(CollectionType, { objects: [], views: {} }) },
              },
              {
                action: NavigationAction.OPEN,
              },
            ]),
          properties: {
            label: ['create collection label', { ns: SPACE_PLUGIN }],
            icon: (props: IconProps) => <CardsThree {...props} />,
            testId: 'spacePlugin.createCollection',
          },
        },
      ],
    },
  ];

  return actions;
};

export const constructObjectActions = ({
  object,
  dispatch,
}: {
  object: EchoReactiveObject<any>;
  dispatch: IntentDispatcher;
}) => {
  const getId = (id: string) => `${id}/${fullyQualifiedId(object)}`;
  const actions: NodeArg<ActionData>[] = [
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
        icon: (props: IconProps) => <PencilSimpleLine {...props} />,
        // TODO(wittjosiah): Doesn't work.
        // keyBinding: 'shift+F6',
        testId: 'spacePlugin.renameObject',
      },
    },
    {
      id: getId(SpaceAction.REMOVE_OBJECT),
      type: ACTION_TYPE,
      data: async ({ node, caller }) => {
        const graph = getGraph(node);
        const collection = graph
          .nodes(node, { relation: 'inbound' })
          .find(({ data }) => data instanceof CollectionType)?.data;
        await dispatch([
          {
            action: SpaceAction.REMOVE_OBJECT,
            data: { object, collection, caller },
          },
        ]);
      },
      properties: {
        label: [
          object instanceof CollectionType ? 'delete collection label' : 'delete object label',
          { ns: SPACE_PLUGIN },
        ],
        icon: (props: IconProps) => <Trash {...props} />,
        keyBinding: object instanceof CollectionType ? undefined : 'shift+meta+Backspace',
        testId: 'spacePlugin.deleteObject',
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
