//
// Copyright 2023 DXOS.org
//

import { Folder as FolderIcon, Plus, type IconProps, Intersect } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { type RevertDeepSignal, deepSignal } from 'deepsignal/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { isGraphNode } from '@braneframe/plugin-graph';
import { Folder } from '@braneframe/types';
import {
  type PluginDefinition,
  type DispatchIntent,
  LayoutAction,
  resolvePlugin,
  parseIntentPlugin,
  parseLayoutPlugin,
  parseGraphPlugin,
  parseMetadataResolverPlugin,
} from '@dxos/app-framework';
import { EventSubscriptions, type UnsubscribeCallback } from '@dxos/async';
import { Expando, TypedObject, isTypedObject } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { Migrations } from '@dxos/migrations';
import { type Client, PublicKey } from '@dxos/react-client';
import { type Space, SpaceProxy, getSpaceForObject } from '@dxos/react-client/echo';
import { inferRecordOrder } from '@dxos/util';

import { exportData } from './backup';
import {
  AwaitingObject,
  DialogRestoreSpace,
  EmptySpace,
  EmptyTree,
  FolderMain,
  MissingObject,
  PopoverRenameObject,
  PopoverRenameSpace,
  SpaceMain,
  SpacePresence,
  SpaceSettings,
} from './components';
import meta, { SPACE_PLUGIN } from './meta';
import translations from './translations';
import { SpaceAction, type SpacePluginProvides, type SpaceSettingsProps, type PluginState } from './types';
import { SHARED, getActiveSpace, isSpace, spaceToGraphNode } from './util';

const ACTIVE_NODE_BROADCAST_INTERVAL = 30_000;

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[SpaceProxy.name] = SpaceProxy;
(globalThis as any)[PublicKey.name] = PublicKey;
(globalThis as any)[Folder.name] = Folder;

export type SpacePluginOptions = {
  version?: string;
  /**
   * Root folder structure is created on application first run if it does not yet exist.
   * This callback is invoked immediately following the creation of the root folder structure.
   *
   * @param params.client DXOS Client
   * @param params.defaultSpace Default space
   * @param params.personalSpaceFolder Folder representing the contents of the default space
   * @param params.dispatch Function to dispatch intents
   */
  onFirstRun?: (params: {
    client: Client;
    defaultSpace: Space;
    personalSpaceFolder: Folder;
    dispatch: DispatchIntent;
  }) => void;
};

export const SpacePlugin = ({
  version,
  onFirstRun,
}: SpacePluginOptions = {}): PluginDefinition<SpacePluginProvides> => {
  const settings = new LocalStorageStore<SpaceSettingsProps>(SPACE_PLUGIN);
  const state = deepSignal<PluginState>({
    awaiting: undefined,
    viewers: [],
  }) as RevertDeepSignal<PluginState>;
  const subscriptions = new EventSubscriptions();
  const spaceSubscriptions = new EventSubscriptions();
  const graphSubscriptions = new Map<string, UnsubscribeCallback>();

  return {
    meta,
    ready: async (plugins) => {
      settings.prop(settings.values.$showHidden!, 'show-hidden', LocalStorageStore.bool);
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      const layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
      if (!clientPlugin || !layoutPlugin || !intentPlugin || !graphPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      const graph = graphPlugin.provides.graph;
      const layout = layoutPlugin.provides.layout;
      const dispatch = intentPlugin.provides.intent.dispatch;

      // Create root folder structure.
      const defaultSpace = client.spaces.default;
      if (clientPlugin.provides.firstRun) {
        const personalSpaceFolder = defaultSpace.db.add(new Folder({ name: client.spaces.default.key.toHex() }));
        defaultSpace.properties[Folder.schema.typename] = personalSpaceFolder;
        onFirstRun?.({
          client,
          defaultSpace,
          personalSpaceFolder,
          dispatch,
        });
      }

      // Check if opening app from invitation code.
      const searchParams = new URLSearchParams(location.search);
      const spaceInvitationCode = searchParams.get('spaceInvitationCode');
      if (spaceInvitationCode) {
        void client.shell.joinSpace({ invitationCode: spaceInvitationCode }).then(async ({ space }) => {
          if (!space) {
            return;
          }

          const url = new URL(location.href);
          const params = Array.from(url.searchParams.entries());
          const [name] = params.find(([name, value]) => value === spaceInvitationCode) ?? [null, null];
          if (name) {
            url.searchParams.delete(name);
            history.replaceState({}, document.title, url.href);
          }

          await dispatch({
            action: LayoutAction.ACTIVATE,
            data: { id: space.key.toHex() },
          });
        });
      }

      // Broadcast active node to other peers in the space.
      subscriptions.add(
        effect(() => {
          const send = () => {
            const identity = client.halo.identity.get();
            const space = getActiveSpace(graph, layout.active);
            if (identity && space && layout.active) {
              void space.postMessage('viewing', {
                identityKey: identity.identityKey.toHex(),
                spaceKey: space.key.toHex(),
                added: [layout.active],
                removed: [layout.previous],
              });
            }
          };

          setInterval(() => send(), ACTIVE_NODE_BROADCAST_INTERVAL);
          send();
        }),
      );

      // Listen for active nodes from other peers in the space.
      subscriptions.add(
        client.spaces.subscribe((spaces) => {
          spaceSubscriptions.clear();
          spaces.forEach((space) => {
            spaceSubscriptions.add(
              space.listen('viewing', (message) => {
                const { added, removed } = message.payload;
                const identityKey = PublicKey.safeFrom(message.payload.identityKey);
                const spaceKey = PublicKey.safeFrom(message.payload.spaceKey);
                if (identityKey && spaceKey && Array.isArray(added) && Array.isArray(removed)) {
                  const newViewers = [
                    ...state.viewers.filter(
                      (viewer) =>
                        !viewer.identityKey.equals(identityKey) ||
                        !viewer.spaceKey.equals(spaceKey) ||
                        (viewer.identityKey.equals(identityKey) &&
                          viewer.spaceKey.equals(spaceKey) &&
                          !removed.some((objectId) => objectId === viewer.objectId) &&
                          !added.some((objectId) => objectId === viewer.objectId)),
                    ),
                    ...added.map((objectId) => ({
                      identityKey,
                      spaceKey,
                      objectId,
                      lastSeen: Date.now(),
                    })),
                  ];
                  newViewers.sort((a, b) => b.lastSeen - a.lastSeen);
                  state.viewers = newViewers;
                }
              }),
            );
          });
        }).unsubscribe,
      );
    },
    unload: async () => {
      settings.close();
      spaceSubscriptions.clear();
      subscriptions.clear();
      graphSubscriptions.forEach((cb) => cb());
      graphSubscriptions.clear();
    },
    provides: {
      space: state as RevertDeepSignal<PluginState>,
      settings: { meta, values: settings.values },
      translations,
      root: () => (state.awaiting ? <AwaitingObject id={state.awaiting} /> : null),
      metadata: {
        records: {
          [Folder.schema.typename]: {
            placeholder: ['unnamed folder label', { ns: SPACE_PLUGIN }],
            icon: (props: IconProps) => <FolderIcon {...props} />,
          },
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              // TODO(wittjosiah): ItemID length constant.
              return isSpace(data.active) ? (
                <SpaceMain space={data.active} />
              ) : data.active instanceof Folder ? (
                <FolderMain folder={data.active} />
              ) : typeof data.active === 'string' && data.active.length === 64 ? (
                <MissingObject id={data.active} />
              ) : null;
            // TODO(burdon): Add role name syntax to minimal plugin docs.
            case 'tree--empty':
              switch (true) {
                case data.plugin === SPACE_PLUGIN:
                  return <EmptyTree />;
                case isGraphNode(data.activeNode) && isSpace(data.activeNode.data):
                  return <EmptySpace />;
                default:
                  return null;
              }
            case 'dialog':
              if (data.component === 'dxos.org/plugin/space/RestoreSpaceDialog' && isSpace(data.subject)) {
                return <DialogRestoreSpace space={data.subject} />;
              } else {
                return null;
              }
            case 'popover':
              if (data.component === 'dxos.org/plugin/space/RenameSpacePopover' && isSpace(data.subject)) {
                return <PopoverRenameSpace space={data.subject} />;
              } else if (
                data.component === 'dxos.org/plugin/space/RenameObjectPopover' &&
                isTypedObject(data.subject)
              ) {
                return <PopoverRenameObject object={data.subject} />;
              } else {
                return null;
              }
            case 'presence':
              return isTypedObject(data.object) ? <SpacePresence object={data.object} /> : null;
            case 'settings':
              return data.plugin === meta.id ? <SpaceSettings settings={settings.values} /> : null;
            default:
              return null;
          }
        },
      },
      graph: {
        builder: ({ parent, plugins }) => {
          if (parent.id !== 'root') {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const metadataPlugin = resolvePlugin(plugins, parseMetadataResolverPlugin);

          const client = clientPlugin?.provides.client;
          const dispatch = intentPlugin?.provides.intent.dispatch;
          const resolve = metadataPlugin?.provides.metadata.resolver;

          if (!dispatch || !resolve || !client) {
            return;
          }

          // Ensure default space is first.
          graphSubscriptions.get(client.spaces.default.key.toHex())?.();
          graphSubscriptions.set(
            client.spaces.default.key.toHex(),
            spaceToGraphNode({ space: client.spaces.default, parent, version, dispatch, resolve }),
          );

          // TODO(wittjosiah): Cannot be a Folder because Spaces are not TypedObjects so can't be saved in the database.
          //  Instead, we store order as an array of space keys.
          let spacesOrder: Expando | undefined;
          const [groupNode] = parent.addNode(SPACE_PLUGIN, {
            id: SHARED,
            label: ['shared spaces label', { ns: SPACE_PLUGIN }],
            actions: [
              {
                id: 'create-space',
                label: ['create space label', { ns: 'os' }],
                icon: (props) => <Plus {...props} />,
                properties: {
                  disposition: 'toolbar',
                  testId: 'spacePlugin.createSpace',
                },
                invoke: () =>
                  dispatch({
                    plugin: SPACE_PLUGIN,
                    action: SpaceAction.CREATE,
                  }),
              },
              {
                id: 'join-space',
                label: ['join space label', { ns: 'os' }],
                icon: (props) => <Intersect {...props} />,
                properties: {
                  testId: 'spacePlugin.joinSpace',
                },
                invoke: () =>
                  dispatch([
                    {
                      plugin: SPACE_PLUGIN,
                      action: SpaceAction.JOIN,
                    },
                    {
                      action: LayoutAction.ACTIVATE,
                    },
                  ]),
              },
            ],
            properties: {
              testId: 'spacePlugin.sharedSpaces',
              role: 'branch',
              // TODO(burdon): Factor out palette constants.
              palette: 'pink',
              childrenPersistenceClass: 'folder',
              onRearrangeChildren: (nextOrder: Space[]) => {
                if (!spacesOrder) {
                  const nextObjectOrder = new Expando({
                    key: SHARED,
                    order: nextOrder.map(({ key }) => key.toHex()),
                  });
                  client.spaces.default.db.add(nextObjectOrder);
                  spacesOrder = nextObjectOrder;
                } else {
                  spacesOrder.order = nextOrder.map(({ key }) => key.toHex());
                }
                updateSpacesOrder(spacesOrder);
              },
            },
          });

          const updateSpacesOrder = (spacesOrder?: Expando) => {
            if (!spacesOrder) {
              return;
            }

            groupNode.childrenMap = inferRecordOrder(groupNode.childrenMap, spacesOrder.order);
          };
          const spacesOrderQuery = client.spaces.default.db.query({ key: SHARED });
          spacesOrder = spacesOrderQuery.objects[0];
          updateSpacesOrder(spacesOrderQuery.objects[0]);
          graphSubscriptions.set(
            SHARED,
            spacesOrderQuery.subscribe(({ objects }) => updateSpacesOrder(objects[0])),
          );

          const createSpaceNodes = (spaces: Space[]) => {
            spaces.forEach((space) => {
              graphSubscriptions.get(space.key.toHex())?.();
              graphSubscriptions.set(
                space.key.toHex(),
                spaceToGraphNode({
                  space,
                  parent: space === client.spaces.default ? parent : groupNode,
                  hidden: settings.values.showHidden,
                  version,
                  dispatch,
                  resolve,
                }),
              );
            });

            updateSpacesOrder(spacesOrder);
          };

          const { unsubscribe } = client.spaces.subscribe((spaces) => createSpaceNodes(spaces));
          const unsubscribeHidden = settings.values.$showHidden!.subscribe(() => createSpaceNodes(client.spaces.get()));

          return () => {
            unsubscribe();
            unsubscribeHidden();
            graphSubscriptions.forEach((cb) => cb());
            graphSubscriptions.clear();
          };
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const client = clientPlugin?.provides.client;
          switch (intent.action) {
            case SpaceAction.WAIT_FOR_OBJECT: {
              state.awaiting = intent.data.id;
              return true;
            }

            case SpaceAction.CREATE: {
              if (!client) {
                return;
              }
              const defaultSpace = client.spaces.default;
              const {
                objects: [sharedSpacesFolder],
              } = defaultSpace.db.query({ key: SHARED });
              const space = await client.spaces.create(intent.data);
              const folder = new Folder({ name: space.key.toHex() }); // TODO(burdon): Will show up in search results.
              space.properties[Folder.schema.typename] = folder;
              sharedSpacesFolder?.objects.push(folder);
              return { space, id: space.key.toHex() };
            }

            case SpaceAction.JOIN: {
              if (client) {
                const { space } = await client.shell.joinSpace();
                if (space) {
                  return { space, id: space.key.toHex() };
                }
              }
              break;
            }

            case SpaceAction.SHARE: {
              const spaceKey = intent.data?.spaceKey && PublicKey.from(intent.data.spaceKey);
              if (clientPlugin && spaceKey) {
                const { members } = await clientPlugin.provides.client.shell.shareSpace({ spaceKey });
                return members && { members };
              }
              break;
            }

            case SpaceAction.RENAME: {
              const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
              return intentPlugin?.provides.intent.dispatch({
                action: LayoutAction.OPEN_POPOVER,
                data: {
                  anchorId: `dxos.org/ui/navtree/${intent.data.space.key.toHex()}`,
                  component: 'dxos.org/plugin/space/RenameSpacePopover',
                  subject: intent.data.space,
                },
              });
            }
            case SpaceAction.OPEN: {
              void intent.data.space.internal.open();
              break;
            }

            case SpaceAction.CLOSE: {
              void intent.data.space.internal.close();
              break;
            }

            case SpaceAction.MIGRATE: {
              const space = intent.data.space;
              if (space instanceof SpaceProxy) {
                return Migrations.migrate(space, intent.data.version);
              }
              break;
            }

            case SpaceAction.EXPORT: {
              const space = intent.data.space;
              if (space instanceof SpaceProxy) {
                // TODO(wittjosiah): Expose translations helper from theme plugin provides.
                const backupBlob = await exportData(space, space.key.toHex());
                const filename = space.properties.name?.replace(/\W/g, '_') || space.key.toHex();
                const url = URL.createObjectURL(backupBlob);
                // TODO(burdon): See DebugMain useFileDownload
                const element = document.createElement('a');
                element.setAttribute('href', url);
                element.setAttribute('download', `${filename}.zip`);
                element.setAttribute('target', 'download');
                element.click();
                return true;
              }
              break;
            }

            case SpaceAction.IMPORT: {
              const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
              return intentPlugin?.provides.intent.dispatch({
                action: LayoutAction.OPEN_DIALOG,
                data: {
                  component: 'dxos.org/plugin/space/RestoreSpaceDialog',
                  subject: intent.data.space,
                },
              });
            }

            case SpaceAction.ADD_OBJECT: {
              if (!(intent.data.object instanceof TypedObject)) {
                return;
              }

              if (intent.data.target instanceof Folder) {
                intent.data.target.objects.push(intent.data.object);
                return intent.data.object;
              }

              if (intent.data.target instanceof SpaceProxy) {
                const space = intent.data.target;
                const folder = space.properties[Folder.schema.typename];
                if (folder instanceof Folder) {
                  folder.objects.push(intent.data.object);
                  return intent.data.object;
                } else {
                  return space.db.add(intent.data.object);
                }
              }
              break;
            }

            case SpaceAction.REMOVE_OBJECT: {
              if (!(intent.data.object instanceof TypedObject)) {
                return;
              }

              const layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
              const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
              if (layoutPlugin?.provides.layout.active === intent.data.object.id) {
                await intentPlugin?.provides.intent.dispatch({
                  action: LayoutAction.ACTIVATE,
                  data: { id: undefined },
                });
              }

              if (intent.data.folder instanceof Folder) {
                const index = intent.data.folder.objects.indexOf(intent.data.object);
                index !== -1 && intent.data.folder.objects.splice(index, 1);
              }

              const space = getSpaceForObject(intent.data.object);

              const folder = space?.properties[Folder.schema.typename];
              if (folder instanceof Folder) {
                const index = folder.objects.indexOf(intent.data.object);
                index !== -1 && folder.objects.splice(index, 1);
              }

              if (space) {
                space.db.remove(intent.data.object);
                return true;
              }
              break;
            }

            case SpaceAction.RENAME_OBJECT: {
              const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
              return intentPlugin?.provides.intent.dispatch({
                action: LayoutAction.OPEN_POPOVER,
                data: {
                  anchorId: `dxos.org/ui/navtree/${intent.data.object.id}`,
                  component: 'dxos.org/plugin/space/RenameObjectPopover',
                  subject: intent.data.object,
                },
              });
            }

            case SpaceAction.TOGGLE_HIDDEN: {
              settings.values.showHidden = intent.data?.state ?? !settings.values.showHidden;
              return true;
            }
          }
        },
      },
    },
  };
};
