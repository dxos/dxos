//
// Copyright 2023 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { pipe } from 'effect';

import { chain, createIntent, LayoutAction, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { EXPANDO_TYPENAME } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Migrations } from '@dxos/migrations';
import {
  ACTION_GROUP_TYPE,
  ACTION_TYPE,
  type ReadableGraph,
  type ActionData,
  type InvokeParams,
  type Node,
  type NodeArg,
  isGraphNode,
} from '@dxos/plugin-graph';
import { fullyQualifiedId, getSpace, type QueryResult, SpaceState, type Space, isSpace } from '@dxos/react-client/echo';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';
import { type TreeData } from '@dxos/react-ui-list';
import { DataType } from '@dxos/schema';

import { SPACE_PLUGIN } from './meta';
import { SpaceAction, SPACE_TYPE, type ObjectForm } from './types';

export const SPACES = `${SPACE_PLUGIN}-spaces`;
export const COMPOSER_SPACE_LOCK = 'dxos.org/plugin/space/lock';
// TODO(wittjosiah): Remove.
export const SHARED = 'shared-spaces';

/**
 * Convert a query result to an Rx value of the objects.
 */
export const rxFromQuery = <T extends Obj.Any>(query: QueryResult<T>): Rx.Rx<T[]> => {
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
  collection,
  space,
  resolve,
}: {
  collection: DataType.Collection;
  space: Space;
  resolve: (typename: string) => Record<string, any>;
}) => {
  return {
    acceptPersistenceClass: new Set(['echo']),
    acceptPersistenceKey: new Set([space.id]),
    role: 'branch',
    onRearrangeChildren: (nextOrder: unknown[]) => {
      // Change on disk.
      collection.objects = nextOrder.filter(Obj.isObject).map(Ref.make);
    },
    onTransferStart: (child: Node<Obj.Any>, index?: number) => {
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
    onTransferEnd: (child: Node<Obj.Any>, destination: Node) => {
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
    onCopy: async (child: Node<Obj.Any>, index?: number) => {
      // Create clone of child and add to destination space.
      const newObject = await cloneObject(child.data, resolve, space);
      space.db.add(newObject);
      if (typeof index !== 'undefined') {
        collection.objects.splice(index, 0, Ref.make(newObject));
      } else {
        collection.objects.push(Ref.make(newObject));
      }
    },
  };
};

const getQueryCollectionNodePartials = ({
  collection,
  space,
  resolve,
}: {
  collection: DataType.QueryCollection;
  space: Space;
  resolve: (typename: string) => Record<string, any>;
}) => {
  return {
    icon: collection.query.typename && resolve(collection.query.typename)?.icon,
    acceptPersistenceClass: new Set(['echo']),
    acceptPersistenceKey: new Set([space.id]),
    role: 'branch',
    canDrop: (source: TreeData) => {
      return (
        isGraphNode(source.item) &&
        Obj.isObject(source.item.data) &&
        Obj.getTypename(source.item.data) === collection.query.typename
      );
    },
    onTransferStart: (child: Node<Obj.Any>, index?: number) => {
      // No-op. Objects are moved into query collections by being removed from their original collection.
    },
    onTransferEnd: (child: Node<Obj.Any>, destination: Node) => {
      // No-op. Objects are moved out of query collections by being added to another collection.
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
  const collection =
    space.state.get() === SpaceState.SPACE_READY && space.properties[Type.getTypename(DataType.Collection)]?.target;
  const partials =
    space.state.get() === SpaceState.SPACE_READY && Obj.instanceOf(DataType.Collection, collection)
      ? getCollectionGraphNodePartials({ collection, space, resolve })
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
      canDrop: (source: TreeData) => {
        // TODO(wittjosiah): Find a way to only allow space as source for rearranging.
        return Obj.isObject(source.item.data) || isSpace(source.item.data);
      },
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
  space,
  object,
  droppable = true,
  navigable = false,
  resolve,
}: {
  space: Space;
  object: Obj.Any;
  droppable?: boolean;
  navigable?: boolean;
  resolve: (typename: string) => Record<string, any>;
}) => {
  const type = Obj.getTypename(object);
  if (!type) {
    return undefined;
  }

  const metadata = resolve(type);
  if (Object.keys(metadata).length === 0) {
    return undefined;
  }

  const partials = Obj.instanceOf(DataType.Collection, object)
    ? getCollectionGraphNodePartials({ collection: object, space, resolve })
    : Obj.instanceOf(DataType.QueryCollection, object)
      ? getQueryCollectionNodePartials({ collection: object, space, resolve })
      : metadata.graphProps;

  return {
    id: fullyQualifiedId(object),
    type,
    cacheable: ['label', 'icon', 'role'],
    data: object,
    properties: {
      // TODO(burdon): Use annotation to get the name field.
      label: metadata.label?.(object) ||
        (object as any).name || ['object name placeholder', { ns: type, default: 'New object' }],
      icon: metadata.icon ?? 'ph--placeholder--regular',
      testId: 'spacePlugin.object',
      persistenceClass: 'echo',
      persistenceKey: space?.id,
      canDrop: (source: TreeData) => {
        return droppable && isGraphNode(source.item) && Obj.isObject(source.item.data);
      },
      ...partials,
    },
  };
};

export const constructObjectActions = ({
  object,
  graph,
  dispatch,
  objectForms,
  navigable = false,
}: {
  object: Obj.Any;
  graph: ReadableGraph;
  dispatch: PromiseIntentDispatcher;
  objectForms: ObjectForm<any>[];
  navigable?: boolean;
}) => {
  const space = getSpace(object);
  invariant(space, 'Space not found');
  const getId = (id: string) => `${id}/${fullyQualifiedId(object)}`;

  const queryCollection = Obj.instanceOf(DataType.QueryCollection, object) ? object : undefined;
  const matchingObjectForm = queryCollection
    ? objectForms.find((form) => Type.getTypename(form.objectSchema) === queryCollection.query.typename)
    : undefined;

  const actions: NodeArg<ActionData>[] = [
    ...(Obj.instanceOf(DataType.Collection, object)
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
    ...(matchingObjectForm
      ? [
          {
            id: getId(SpaceAction.OpenCreateObject._tag),
            type: ACTION_TYPE,
            data: async () => {
              if (matchingObjectForm.formSchema) {
                await dispatch(
                  createIntent(SpaceAction.OpenCreateObject, {
                    target: space,
                    typename: queryCollection?.query.typename,
                  }),
                );
              } else {
                await dispatch(
                  pipe(
                    matchingObjectForm.getIntent({}, { space }),
                    chain(SpaceAction.AddObject, { target: space, hidden: true }),
                    chain(LayoutAction.Open, { part: 'main' }),
                  ),
                );
              }
            },
            properties: {
              label: ['create object in smart collection label', { ns: SPACE_PLUGIN }],
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
          Obj.instanceOf(DataType.Collection, object) ? 'rename collection label' : 'rename object label',
          { ns: SPACE_PLUGIN },
        ],
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
      id: getId(SpaceAction.RemoveObjects._tag),
      type: ACTION_TYPE,
      data: async () => {
        const collection = graph
          .getConnections(fullyQualifiedId(object), 'inbound')
          .find(({ data }) => Obj.instanceOf(DataType.Collection, data))?.data;
        await dispatch(createIntent(SpaceAction.RemoveObjects, { objects: [object], target: collection }));
      },
      properties: {
        label: [
          Obj.instanceOf(DataType.Collection, object) ? 'delete collection label' : 'delete object label',
          { ns: SPACE_PLUGIN },
        ],
        icon: 'ph--trash--regular',
        disposition: 'list-item',
        // TODO(wittjosiah): This is a browser shortcut.
        // keyBinding: object instanceof CollectionType ? undefined : 'shift+meta+Backspace',
        testId: 'spacePlugin.deleteObject',
      },
    },
    ...(navigable || (!Obj.instanceOf(DataType.Collection, object) && !Obj.instanceOf(DataType.QueryCollection, object))
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
              disposition: 'list-item',
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
        disposition: 'heading-list-item',
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
  object: Type.Expando,
  resolve: (typename: string) => Record<string, any>,
  newSpace: Space,
): Promise<Type.Expando> => {
  const schema = Obj.getSchema(object);
  const typename = schema ? Type.getTypename(schema) ?? EXPANDO_TYPENAME : EXPANDO_TYPENAME;
  const metadata = resolve(typename);
  const serializer = metadata.serializer;
  invariant(serializer, `No serializer for type: ${typename}`);
  const content = await serializer.serialize({ object });
  return serializer.deserialize({ content, space: newSpace, newId: true });
};
