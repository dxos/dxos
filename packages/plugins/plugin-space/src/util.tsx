//
// Copyright 2023 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';

import { createIntent, LayoutAction, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { type BaseObject, EXPANDO_TYPENAME, getTypeAnnotation, getTypename, type Expando } from '@dxos/echo-schema';
import { getSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { makeRef } from '@dxos/live-object';
import { Migrations } from '@dxos/migrations';
import {
  ACTION_GROUP_TYPE,
  ACTION_TYPE,
  type ReadableGraph,
  type ActionData,
  type InvokeParams,
  type Node,
  type NodeArg,
} from '@dxos/plugin-graph';
import {
  fullyQualifiedId,
  getSpace,
  isEchoObject,
  type QueryResult,
  SpaceState,
  type AnyLiveObject,
  type Space,
} from '@dxos/react-client/echo';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';

import { SPACE_PLUGIN } from './meta';
import { CollectionType, SpaceAction, SPACE_TYPE } from './types';

export const SPACES = `${SPACE_PLUGIN}-spaces`;
export const COMPOSER_SPACE_LOCK = 'dxos.org/plugin/space/lock';
// TODO(wittjosiah): Remove.
export const SHARED = 'shared-spaces';

/**
 * Convert a query result to an Rx value of the objects.
 */
export const rxFromQuery = <T extends BaseObject>(query: QueryResult<T>): Rx.Rx<T[]> => {
  return Rx.make((get) => {
    const unsubscribe = query.subscribe((result) => {
      get.setSelf(result.objects);
    });

    get.addFinalizer(() => unsubscribe());

    return query.objects;
  });
};

// TODO(wittjosiah): Factor out? Expose via capability?
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
  resolve: (typename: string) => Record<string, any>;
}) => {
  return {
    acceptPersistenceClass: new Set(['echo']),
    acceptPersistenceKey: new Set([space.id]),
    role: 'branch',
    onRearrangeChildren: (nextOrder: unknown[]) => {
      // Change on disk.
      collection.objects = nextOrder.filter(isEchoObject).map(makeRef);
    },
    onTransferStart: (child: Node<AnyLiveObject<any>>, index?: number) => {
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
    onTransferEnd: (child: Node<AnyLiveObject<any>>, destination: Node) => {
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
    onCopy: async (child: Node<AnyLiveObject<any>>, index?: number) => {
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
  resolve: (typename: string) => Record<string, any>;
}) => {
  const hasPendingMigration = checkPendingMigration(space);
  const collection = space.state.get() === SpaceState.SPACE_READY && space.properties[CollectionType.typename]?.target;
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
      hue: space.state.get() === SpaceState.SPACE_READY && space.properties.hue,
      icon:
        space.state.get() === SpaceState.SPACE_READY && space.properties.icon
          ? `ph--${space.properties.icon}--regular`
          : undefined,
      disabled: !navigable || space.state.get() !== SpaceState.SPACE_READY || hasPendingMigration,
      testId: 'spacePlugin.space',
    },
    nodes: [
      {
        id: `settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`,
        type: `${SPACE_PLUGIN}/settings`,
        data: null,
        properties: {
          label: ['settings panel label', { ns: SPACE_PLUGIN }],
          icon: 'ph--faders--regular',
          disposition: 'alternate-tree',
        },
        nodes: [
          {
            id: `properties-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`,
            type: `${SPACE_PLUGIN}/properties`,
            data: `${SPACE_PLUGIN}/properties`,
            properties: {
              label: ['space settings properties label', { ns: SPACE_PLUGIN }],
              icon: 'ph--sliders--regular',
              position: 'hoist',
            },
          },
          {
            id: `members-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`,
            type: `${SPACE_PLUGIN}/members`,
            data: `${SPACE_PLUGIN}/members`,
            properties: {
              label: ['members panel label', { ns: SPACE_PLUGIN }],
              icon: 'ph--users--regular',
              position: 'hoist',
            },
          },
          {
            id: `schema-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`,
            type: `${SPACE_PLUGIN}/schema`,
            data: `${SPACE_PLUGIN}/schema`,
            properties: {
              label: ['space settings schema label', { ns: SPACE_PLUGIN }],
              icon: 'ph--shapes--regular',
            },
          },
        ],
      },
    ],
  };
};

export const constructSpaceActions = ({
  space,
  dispatch,
  personal,
  migrating,
}: {
  space: Space;
  dispatch: PromiseIntentDispatcher;
  personal?: boolean;
  migrating?: boolean;
}) => {
  const state = space.state.get();
  const hasPendingMigration = checkPendingMigration(space);
  const getId = (id: string) => `${id}/${space.id}`;
  const actions: NodeArg<ActionData>[] = [];

  if (hasPendingMigration) {
    actions.push({
      id: getId(SpaceAction.Migrate._tag),
      type: ACTION_GROUP_TYPE,
      data: async () => {
        await dispatch(createIntent(SpaceAction.Migrate, { space }));
      },
      properties: {
        label: ['migrate space label', { ns: SPACE_PLUGIN }],
        icon: 'ph--database--regular',
        disposition: 'list-item-primary',
        disabled: migrating || Migrations.running(space),
      },
    });
  }

  if (state === SpaceState.SPACE_READY && !hasPendingMigration) {
    actions.push(
      {
        id: getId(SpaceAction.OpenCreateObject._tag),
        type: ACTION_TYPE,
        data: async () => {
          await dispatch(createIntent(SpaceAction.OpenCreateObject, { target: space }));
        },
        properties: {
          label: ['create object in space label', { ns: SPACE_PLUGIN }],
          icon: 'ph--plus--regular',
          disposition: 'item',
          testId: 'spacePlugin.createObject',
        },
      },
      {
        id: getId(SpaceAction.Rename._tag),
        type: ACTION_TYPE,
        data: async (params?: InvokeParams) => {
          await dispatch(createIntent(SpaceAction.Rename, { space, caller: params?.caller }));
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
    );
  }

  return actions;
};

export const createObjectNode = ({
  object,
  space,
  navigable = false,
  resolve,
}: {
  object: AnyLiveObject<any>;
  space: Space;
  navigable?: boolean;
  resolve: (typename: string) => Record<string, any>;
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
        object.name || ['object name placeholder', { ns: type, default: 'New object' }],
      icon: metadata.icon ?? 'ph--placeholder--regular',
      testId: 'spacePlugin.object',
      persistenceClass: 'echo',
      persistenceKey: space?.id,
    },
  };
};

export const constructObjectActions = ({
  object,
  graph,
  dispatch,
  navigable = false,
}: {
  object: AnyLiveObject<any>;
  graph: ReadableGraph;
  dispatch: PromiseIntentDispatcher;
  navigable?: boolean;
}) => {
  const space = getSpace(object);
  invariant(space, 'Space not found');
  const getId = (id: string) => `${id}/${fullyQualifiedId(object)}`;
  const actions: NodeArg<ActionData>[] = [
    ...(object instanceof CollectionType
      ? [
          {
            id: getId(SpaceAction.OpenCreateObject._tag),
            type: ACTION_TYPE,
            data: async () => {
              await dispatch(createIntent(SpaceAction.OpenCreateObject, { target: object }));
            },
            properties: {
              label: ['create object in collection label', { ns: SPACE_PLUGIN }],
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.createObject',
            },
          },
        ]
      : []),
    {
      id: getId(SpaceAction.RenameObject._tag),
      type: ACTION_TYPE,
      data: async (params?: InvokeParams) => {
        await dispatch(createIntent(SpaceAction.RenameObject, { object, caller: params?.caller }));
      },
      properties: {
        label: [
          object instanceof CollectionType ? 'rename collection label' : 'rename object label',
          { ns: SPACE_PLUGIN },
        ],
        icon: 'ph--pencil-simple-line--regular',
        // TODO(wittjosiah): Need's focus.
        keyBinding: {
          macos: 'shift+F6',
        },
        testId: 'spacePlugin.renameObject',
      },
    },
    {
      id: getId(SpaceAction.RemoveObjects._tag),
      type: ACTION_TYPE,
      data: async () => {
        const collection = graph
          .getConnections(fullyQualifiedId(object), 'inbound')
          .find(({ data }) => data instanceof CollectionType)?.data;
        await dispatch(createIntent(SpaceAction.RemoveObjects, { objects: [object], target: collection }));
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
    ...(navigable || !(object instanceof CollectionType)
      ? [
          {
            id: getId('copy-link'),
            type: ACTION_TYPE,
            data: async () => {
              const url = `${window.location.origin}/${space.id}/${fullyQualifiedId(object)}`;
              await navigator.clipboard.writeText(url);
            },
            properties: {
              label: ['copy link label', { ns: SPACE_PLUGIN }],
              icon: 'ph--link--regular',
              testId: 'spacePlugin.copyLink',
            },
          },
        ]
      : []),
    // TODO(wittjosiah): Factor out and apply to all nodes.
    {
      id: getId(LayoutAction.Expose._tag),
      type: ACTION_TYPE,
      data: async () => {
        await dispatch(createIntent(LayoutAction.Expose, { part: 'navigation', subject: fullyQualifiedId(object) }));
      },
      properties: {
        label: ['expose object label', { ns: SPACE_PLUGIN }],
        icon: 'ph--eye--regular',
        testId: 'spacePlugin.exposeObject',
      },
    },
  ];

  return actions;
};

/**
 * @deprecated This is a temporary solution.
 */
export const getNestedObjects = async (
  object: AnyLiveObject<any>,
  resolve: (typename: string) => Record<string, any>,
): Promise<AnyLiveObject<any>[]> => {
  const type = getTypename(object);
  if (!type) {
    return [];
  }

  const metadata = resolve(type);
  const loadReferences = metadata?.loadReferences;
  if (typeof loadReferences !== 'function') {
    return [];
  }

  const objects: AnyLiveObject<any>[] = await loadReferences(object);
  const nested = await Promise.all(objects.map((object) => getNestedObjects(object, resolve)));
  return [...objects, ...nested.flat()];
};

/**
 * @deprecated Workaround for ECHO not supporting clone.
 */
// TODO(burdon): Remove.
export const cloneObject = async (
  object: Expando,
  resolve: (typename: string) => Record<string, any>,
  newSpace: Space,
): Promise<Expando> => {
  const schema = getSchema(object);
  const typename = schema ? getTypeAnnotation(schema)?.typename ?? EXPANDO_TYPENAME : EXPANDO_TYPENAME;
  const metadata = resolve(typename);
  const serializer = metadata.serializer;
  invariant(serializer, `No serializer for type: ${typename}`);
  const content = await serializer.serialize({ object });
  return serializer.deserialize({ content, space: newSpace, newId: true });
};
