//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import {
  Expando,
  Filter,
  FQ_ID_LENGTH,
  getSpace,
  isEchoObject,
  OBJECT_ID_LENGTH,
  type AnyLiveObject,
  SPACE_ID_LENGTH,
  SpaceState,
  type Space,
  parseId,
  Query,
} from '@dxos/client/echo';
import { isDeleted } from '@dxos/live-object';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, toSignal, type Node } from '@dxos/plugin-graph';
import { isNonNullable } from '@dxos/util';

import { SpaceCapabilities } from './capabilities';
import { SPACE_PLUGIN } from '../meta';
import { CollectionType, SPACE_TYPE, SpaceAction, type SpaceSettingsProps } from '../types';
import {
  constructObjectActions,
  constructSpaceActions,
  constructSpaceNode,
  createObjectNode,
  memoizeQuery,
  SHARED,
  SPACES,
} from '../util';

export default (context: PluginsContext) => {
  const resolve = (typename: string) =>
    context.requestCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

  const spacesNode = {
    id: SPACES,
    type: SPACES,
    cacheable: ['label', 'role'],
    properties: {
      label: ['spaces label', { ns: SPACE_PLUGIN }],
      icon: 'ph--planet--regular',
      testId: 'spacePlugin.spaces',
      role: 'branch',
      disposition: 'collection',
      disabled: true,
      childrenPersistenceClass: 'echo',
      onRearrangeChildren: async (nextOrder: Space[]) => {
        const { graph } = context.requestCapability(Capabilities.AppGraph);
        const client = context.requestCapability(ClientCapabilities.Client);

        // NOTE: This is needed to ensure order is updated by next animation frame.
        // TODO(wittjosiah): Is there a better way to do this?
        //   If not, graph should be passed as an argument to the extension.
        graph._sortEdges(
          SPACES,
          'outbound',
          nextOrder.map(({ id }) => id),
        );

        const {
          objects: [spacesOrder],
        } = await client.spaces.default.db.query(Filter.type(Expando, { key: SHARED })).run();
        if (spacesOrder) {
          spacesOrder.order = nextOrder.map(({ id }) => id);
        } else {
          log.warn('spaces order object not found');
        }
      },
    },
  };

  return contributes(Capabilities.AppGraphBuilder, [
    // Primary actions.
    createExtension({
      id: `${SPACE_PLUGIN}/primary-actions`,
      position: 'hoist',
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () => [
        {
          id: SpaceAction.OpenCreateSpace._tag,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(SpaceAction.OpenCreateSpace));
          },
          properties: {
            label: ['create space label', { ns: SPACE_PLUGIN }],
            icon: 'ph--plus--regular',
            testId: 'spacePlugin.createSpace',
            disposition: 'menu',
          },
        },
        {
          id: SpaceAction.Join._tag,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(SpaceAction.Join));
          },
          properties: {
            label: ['join space label', { ns: SPACE_PLUGIN }],
            icon: 'ph--sign-in--regular',
            testId: 'spacePlugin.joinSpace',
            disposition: 'menu',
          },
        },
        {
          id: SpaceAction.OpenMembers._tag,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            const layout = context.requestCapability(Capabilities.Layout);
            const client = context.requestCapability(ClientCapabilities.Client);
            const { spaceId } = parseId(layout.workspace);
            const space = (spaceId && client.spaces.get(spaceId)) ?? client.spaces.default;
            await dispatch(createIntent(SpaceAction.OpenMembers, { space }));
          },
          properties: {
            label: ['share space label', { ns: SPACE_PLUGIN }],
            icon: 'ph--users--regular',
            testId: 'spacePlugin.shareSpace',
            keyBinding: {
              macos: 'meta+.',
              windows: 'alt+.',
            },
          },
        },
        {
          id: SpaceAction.OpenSettings._tag,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            const layout = context.requestCapability(Capabilities.Layout);
            const client = context.requestCapability(ClientCapabilities.Client);
            const { spaceId } = parseId(layout.workspace);
            const space = (spaceId && client.spaces.get(spaceId)) ?? client.spaces.default;
            await dispatch(createIntent(SpaceAction.OpenSettings, { space }));
          },
          properties: {
            label: ['open current space settings label', { ns: SPACE_PLUGIN }],
            icon: 'ph--faders--regular',
            keyBinding: {
              macos: 'meta+shift+,',
              windows: 'ctrl+shift+,',
            },
          },
        },
      ],
    }),

    // Create spaces group node.
    createExtension({
      id: `${SPACE_PLUGIN}/root`,
      position: 'hoist',
      filter: (node): node is Node<null> => node.id === 'root',
      connector: () => [spacesNode],
      resolver: ({ id }) => (id === SPACES ? spacesNode : undefined),
    }),

    // Create space nodes.
    createExtension({
      id: SPACES,
      filter: (node): node is Node<null> => node.id === SPACES,
      connector: () => {
        const client = context.requestCapability(ClientCapabilities.Client);
        const spaces = toSignal(
          (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
          () => client.spaces.get(),
        );

        const isReady = toSignal(
          (onChange) => client.spaces.isReady.subscribe(() => onChange()).unsubscribe,
          () => client.spaces.isReady.get(),
        );

        if (!spaces || !isReady) {
          return;
        }

        const state = context.requestCapability(SpaceCapabilities.State);
        const settings = context
          .requestCapabilities(Capabilities.SettingsStore)[0]
          ?.getStore<SpaceSettingsProps>(SPACE_PLUGIN)?.value;

        // TODO(wittjosiah): During client reset, accessing default space throws.
        try {
          const [spacesOrder] = memoizeQuery(client.spaces.default, Query.type(Expando, { key: SHARED }));
          const order: string[] = spacesOrder?.order ?? [];
          const orderMap = new Map(order.map((id, index) => [id, index]));
          return [
            ...spaces
              .filter((space) => orderMap.has(space.id))
              .sort((a, b) => orderMap.get(a.id)! - orderMap.get(b.id)!),
            ...spaces.filter((space) => !orderMap.has(space.id)),
          ]
            .filter((space) => (settings?.showHidden ? true : space.state.get() !== SpaceState.SPACE_INACTIVE))
            .map((space) =>
              constructSpaceNode({
                space,
                navigable: state.navigableCollections,
                personal: space === client.spaces.default,
                namesCache: state.spaceNames,
                resolve,
              }),
            );
        } catch {}
      },
      resolver: ({ id }) => {
        if (id.length !== SPACE_ID_LENGTH) {
          return;
        }

        const client = context.requestCapability(ClientCapabilities.Client);
        const spaces = toSignal(
          (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
          () => client.spaces.get(),
        );

        const isReady = toSignal(
          (onChange) => client.spaces.isReady.subscribe(() => onChange()).unsubscribe,
          () => client.spaces.isReady.get(),
        );

        if (!spaces || !isReady) {
          return;
        }

        const space = spaces.find((space) => space.id === id);
        if (!space) {
          return;
        }

        if (space.state.get() === SpaceState.SPACE_INACTIVE) {
          return false;
        } else if (space.state.get() !== SpaceState.SPACE_READY) {
          return undefined;
        } else {
          const state = context.requestCapability(SpaceCapabilities.State);
          return constructSpaceNode({
            space,
            navigable: state.navigableCollections,
            personal: space === client.spaces.default,
            namesCache: state.spaceNames,
            resolve,
          });
        }
      },
    }),

    // Create space actions.
    createExtension({
      id: `${SPACE_PLUGIN}/actions`,
      filter: (node): node is Node<Space> => node.type === SPACE_TYPE,
      actions: ({ node }) => {
        const space = node.data;
        const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
        const client = context.requestCapability(ClientCapabilities.Client);
        const state = context.requestCapability(SpaceCapabilities.State);
        return constructSpaceActions({
          space,
          dispatch,
          personal: space === client.spaces.default,
          migrating: state.sdkMigrationRunning[space.id],
        });
      },
    }),

    // Create nodes for objects in the root collection of a space.
    createExtension({
      id: `${SPACE_PLUGIN}/root-collection`,
      filter: (node): node is Node<Space> => node.type === SPACE_TYPE,
      connector: ({ node }) => {
        const space = node.data;
        const spaceState = toSignal(
          (onChange) => space.state.subscribe(() => onChange()).unsubscribe,
          () => space.state.get(),
          space.id,
        );
        if (spaceState !== SpaceState.SPACE_READY) {
          return;
        }

        const collection = space.properties[CollectionType.typename]?.target as CollectionType | undefined;
        if (!collection) {
          return;
        }

        const state = context.requestCapability(SpaceCapabilities.State);

        return collection.objects
          .map((object) => object.target)
          .filter(isNonNullable)
          .map((object) => createObjectNode({ object, space, resolve, navigable: state.navigableCollections }))
          .filter(isNonNullable);
      },
    }),

    // Create nodes for objects in a collection or by its fully qualified id.
    createExtension({
      id: `${SPACE_PLUGIN}/objects`,
      filter: (node): node is Node<CollectionType> => node.data instanceof CollectionType,
      connector: ({ node }) => {
        const collection = node.data;
        const space = getSpace(collection);
        if (!space) {
          return;
        }

        const state = context.requestCapability(SpaceCapabilities.State);

        return collection.objects
          .map((object) => object.target)
          .filter(isNonNullable)
          .map((object) => createObjectNode({ object, space, resolve, navigable: state.navigableCollections }))
          .filter(isNonNullable);
      },
      resolver: ({ id }) => {
        if (id.length !== FQ_ID_LENGTH) {
          return;
        }

        const [spaceId, objectId] = id.split(':');
        if (spaceId.length !== SPACE_ID_LENGTH && objectId.length !== OBJECT_ID_LENGTH) {
          return;
        }

        const client = context.requestCapability(ClientCapabilities.Client);
        const space = client.spaces.get().find((space) => space.id === spaceId);
        if (!space) {
          return;
        }

        const spaceState = toSignal(
          (onChange) => space.state.subscribe(() => onChange()).unsubscribe,
          () => space.state.get(),
          space.id,
        );
        if (spaceState !== SpaceState.SPACE_READY) {
          return;
        }

        const [object] = memoizeQuery(space, Query.select(Filter.ids(objectId)));
        if (!object) {
          return;
        }

        if (isDeleted(object)) {
          return false;
        } else {
          const state = context.requestCapability(SpaceCapabilities.State);
          return createObjectNode({ object, space, resolve, navigable: state.navigableCollections });
        }
      },
    }),

    // Create collection actions and action groups.
    createExtension({
      id: `${SPACE_PLUGIN}/object-actions`,
      filter: (node): node is Node<AnyLiveObject<any>> => isEchoObject(node.data),
      actions: ({ node }) => {
        const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
        const state = context.requestCapability(SpaceCapabilities.State);
        return constructObjectActions({ node, dispatch, navigable: state.navigableCollections });
      },
    }),

    // Object settings plank companion.
    createExtension({
      id: `${SPACE_PLUGIN}/settings`,
      filter: (node): node is Node<AnyLiveObject<any>> => isEchoObject(node.data),
      connector: ({ node }) => [
        {
          id: [node.id, 'settings'].join(ATTENDABLE_PATH_SEPARATOR),
          type: PLANK_COMPANION_TYPE,
          data: 'settings',
          properties: {
            label: ['object settings label', { ns: SPACE_PLUGIN }],
            icon: 'ph--sliders--regular',
            disposition: 'hidden',
            position: 'fallback',
          },
        },
      ],
    }),
  ]);
};
