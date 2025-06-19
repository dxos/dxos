//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Array, Option, pipe } from 'effect';

import { Capabilities, contributes, createIntent, type PluginContext } from '@dxos/app-framework';
import { getSpace, isEchoObject, SpaceState, type Space, isSpace, type QueryResult } from '@dxos/client/echo';
import { Filter, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, rxFromObservable, ROOT_ID, rxFromSignal } from '@dxos/plugin-graph';
import { isNonNullable } from '@dxos/util';

import { SpaceCapabilities } from './capabilities';
import { getActiveSpace } from '../hooks';
import { SPACE_PLUGIN } from '../meta';
import { CollectionType, SPACE_TYPE, SpaceAction, type SpaceSettingsProps } from '../types';
import {
  constructObjectActions,
  constructSpaceActions,
  constructSpaceNode,
  createObjectNode,
  rxFromQuery,
  SHARED,
  SPACES,
} from '../util';

export default (context: PluginContext) => {
  const resolve = (typename: string) =>
    context.getCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

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
        const { graph } = context.getCapability(Capabilities.AppGraph);
        const client = context.getCapability(ClientCapabilities.Client);

        // NOTE: This is needed to ensure order is updated by next animation frame.
        // TODO(wittjosiah): Is there a better way to do this?
        //   If not, graph should be passed as an argument to the extension.
        graph.sortEdges(
          SPACES,
          'outbound',
          nextOrder.map(({ id }) => id),
        );

        const {
          objects: [spacesOrder],
        } = await client.spaces.default.db.query(Filter.type(Type.Expando, { key: SHARED })).run();
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
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => [
              {
                id: SpaceAction.OpenCreateSpace._tag,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
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
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
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
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  const client = context.getCapability(ClientCapabilities.Client);
                  const space = getActiveSpace(context) ?? client.spaces.default;
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
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  const client = context.getCapability(ClientCapabilities.Client);
                  const space = getActiveSpace(context) ?? client.spaces.default;
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
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Create spaces group node.
    createExtension({
      id: `${SPACE_PLUGIN}/root`,
      position: 'hoist',
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => [spacesNode]),
            Option.getOrElse(() => []),
          ),
        ),
      // resolver: ({ id }) => (id === SPACES ? spacesNode : undefined),
    }),

    // Create space nodes.
    createExtension({
      id: SPACES,
      connector: (node) => {
        let query: QueryResult<Type.Expando> | undefined;
        return Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === SPACES ? Option.some(node) : Option.none())),
            Option.map(() => {
              const state = context.getCapability(SpaceCapabilities.State);
              const client = context.getCapability(ClientCapabilities.Client);
              const spacesRx = rxFromObservable(client.spaces);
              const isReadyRx = rxFromObservable(client.spaces.isReady);

              const spaces = get(spacesRx);
              const isReady = get(isReadyRx);

              if (!spaces || !isReady) {
                return [];
              }

              const settings = get(context.capabilities(Capabilities.SettingsStore))[0]?.getStore<SpaceSettingsProps>(
                SPACE_PLUGIN,
              )?.value;

              // TODO(wittjosiah): During client reset, accessing default space throws.
              try {
                if (!query) {
                  query = client.spaces.default.db.query(Filter.type(Type.Expando, { key: SHARED }));
                }
                const [spacesOrder] = get(rxFromQuery(query));
                return get(
                  rxFromSignal(() => {
                    const order: string[] = spacesOrder?.order ?? [];
                    const orderMap = new Map(order.map((id, index) => [id, index]));
                    return [
                      ...spaces
                        .filter((space) => orderMap.has(space.id))
                        .sort((a, b) => orderMap.get(a.id)! - orderMap.get(b.id)!),
                      ...spaces.filter((space) => !orderMap.has(space.id)),
                    ]
                      .filter((space) =>
                        settings?.showHidden ? true : space.state.get() !== SpaceState.SPACE_INACTIVE,
                      )
                      .map((space) =>
                        constructSpaceNode({
                          space,
                          navigable: state.navigableCollections,
                          personal: space === client.spaces.default,
                          namesCache: state.spaceNames,
                          resolve,
                        }),
                      );
                  }),
                );
              } catch {
                return [];
              }
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
      // resolver: ({ id }) => {
      //   if (id.length !== SPACE_ID_LENGTH) {
      //     return;
      //   }

      //   const client = context.requestCapability(ClientCapabilities.Client);
      //   const spaces = toSignal(
      //     (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
      //     () => client.spaces.get(),
      //   );

      //   const isReady = toSignal(
      //     (onChange) => client.spaces.isReady.subscribe(() => onChange()).unsubscribe,
      //     () => client.spaces.isReady.get(),
      //   );

      //   if (!spaces || !isReady) {
      //     return;
      //   }

      //   const space = spaces.find((space) => space.id === id);
      //   if (!space) {
      //     return;
      //   }

      //   if (space.state.get() === SpaceState.SPACE_INACTIVE) {
      //     return false;
      //   } else if (space.state.get() !== SpaceState.SPACE_READY) {
      //     return undefined;
      //   } else {
      //     const state = context.requestCapability(SpaceCapabilities.State);
      //     return constructSpaceNode({
      //       space,
      //       navigable: state.navigableCollections,
      //       personal: space === client.spaces.default,
      //       namesCache: state.spaceNames,
      //       resolve,
      //     });
      //   }
      // },
    }),

    // Create space actions.
    createExtension({
      id: `${SPACE_PLUGIN}/actions`,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.flatMap((space) => {
              const [dispatcher] = get(context.capabilities(Capabilities.IntentDispatcher));
              const [client] = get(context.capabilities(ClientCapabilities.Client));
              const [state] = get(context.capabilities(SpaceCapabilities.State));

              if (!dispatcher || !client || !state) {
                return Option.none();
              } else {
                return Option.some({
                  space,
                  dispatch: dispatcher.dispatchPromise,
                  personal: space === client.spaces.default,
                  migrating: state.sdkMigrationRunning[space.id],
                });
              }
            }),
            Option.map((params) => constructSpaceActions(params)),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Create nodes for objects in the root collection of a space.
    createExtension({
      id: `${SPACE_PLUGIN}/root-collection`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.map((space) => {
              const state = context.getCapability(SpaceCapabilities.State);

              const spaceState = get(rxFromObservable(space.state));
              if (spaceState !== SpaceState.SPACE_READY) {
                return [];
              }

              const collection = get(
                rxFromSignal(() => space.properties[CollectionType.typename]?.target as CollectionType | undefined),
              );
              if (!collection) {
                return [];
              }

              return get(
                rxFromSignal(() =>
                  pipe(
                    collection.objects,
                    Array.map((object) => object.target),
                    Array.filter(isNonNullable),
                    Array.map((object) =>
                      createObjectNode({
                        object,
                        space,
                        resolve,
                        navigable: state.navigableCollections,
                      }),
                    ),
                    Array.filter(isNonNullable),
                  ),
                ),
              );
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Create nodes for objects in a collection or by its fully qualified id.
    createExtension({
      id: `${SPACE_PLUGIN}/objects`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.data instanceof CollectionType ? Option.some(node.data) : Option.none())),
            Option.map((collection) => {
              const state = context.getCapability(SpaceCapabilities.State);
              const space = getSpace(collection);

              return get(
                rxFromSignal(() =>
                  pipe(
                    collection.objects,
                    Array.map((object) => object.target),
                    Array.filter(isNonNullable),
                    Array.map(
                      (object) =>
                        space && createObjectNode({ object, space, resolve, navigable: state.navigableCollections }),
                    ),
                    Array.filter(isNonNullable),
                  ),
                ),
              );
            }),
            Option.getOrElse(() => []),
          ),
        ),
      // resolver: ({ id }) => {
      //   if (id.length !== FQ_ID_LENGTH) {
      //     return;
      //   }

      //   const [spaceId, objectId] = id.split(':');
      //   if (spaceId.length !== SPACE_ID_LENGTH && objectId.length !== OBJECT_ID_LENGTH) {
      //     return;
      //   }

      //   const client = context.requestCapability(ClientCapabilities.Client);
      //   const space = client.spaces.get().find((space) => space.id === spaceId);
      //   if (!space) {
      //     return;
      //   }

      //   const spaceState = toSignal(
      //     (onChange) => space.state.subscribe(() => onChange()).unsubscribe,
      //     () => space.state.get(),
      //     space.id,
      //   );
      //   if (spaceState !== SpaceState.SPACE_READY) {
      //     return;
      //   }

      //   const [object] = memoizeQuery(space, Query.select(Filter.ids(objectId)));
      //   if (!object) {
      //     return;
      //   }

      //   if (isDeleted(object)) {
      //     return false;
      //   } else {
      //     const state = context.requestCapability(SpaceCapabilities.State);
      //     return createObjectNode({ object, space, resolve, navigable: state.navigableCollections });
      //   }
      // },
    }),

    // Create collection actions and action groups.
    createExtension({
      id: `${SPACE_PLUGIN}/object-actions`,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (isEchoObject(node.data) ? Option.some(node.data) : Option.none())),
            Option.flatMap((object) => {
              const [dispatcher] = get(context.capabilities(Capabilities.IntentDispatcher));
              const [appGraph] = get(context.capabilities(Capabilities.AppGraph));
              const [state] = get(context.capabilities(SpaceCapabilities.State));

              if (!dispatcher || !appGraph || !state) {
                return Option.none();
              } else {
                return Option.some({
                  object,
                  graph: appGraph.graph,
                  dispatch: dispatcher.dispatchPromise,
                  navigable: get(rxFromSignal(() => state.navigableCollections)),
                });
              }
            }),
            Option.map((params) => constructObjectActions(params)),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Object settings plank companion.
    createExtension({
      id: `${SPACE_PLUGIN}/settings`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (isEchoObject(node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
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
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
};
