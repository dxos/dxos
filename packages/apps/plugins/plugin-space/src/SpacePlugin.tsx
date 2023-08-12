//
// Copyright 2023 DXOS.org
//

import { effect } from '@preact/signals-core';
import { getIndices } from '@tldraw/indices';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { IntentProvides } from '@braneframe/plugin-intent';
import { SessionNode, SessionPluginParticipant, SessionPluginProvides } from '@braneframe/plugin-session';
import { SplitViewProvides } from '@braneframe/plugin-splitview';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { TreeViewPluginProvides } from '@braneframe/plugin-treeview';
import { EventSubscriptions } from '@dxos/async';
import { createSubscription } from '@dxos/echo-schema';
import {
  Client,
  IFrameClientServicesHost,
  IFrameClientServicesProxy,
  PublicKey,
  ShellLayout,
} from '@dxos/react-client';
import { SpaceProxy, Space } from '@dxos/react-client/echo';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import { backupSpace } from './backup';
import { DialogRenameSpace, DialogRestoreSpace, EmptyTree, SpaceMain, SpaceMainEmpty } from './components';
import translations from './translations';
import { SPACE_PLUGIN, SPACE_PLUGIN_SHORT_ID, SpaceAction, SpaceNode } from './types';
import { isSpace, isSpaceNode } from './util';

type SpacePluginProvides = SessionPluginParticipant & IntentProvides & TranslationsProvides;

const spaceToSessionNode = (space: Space, index: string): SpaceNode => ({
  id: `dxos.org/space/${space.key.toHex()}`,
  label: (space.properties as any).title ?? 'Space',
  params: {
    index,
    spaceKey: space.key.toHex(),
  },
});

const resolveSpace = (client: Client, node: SpaceNode): Space | undefined => {
  return node.params ? client.getSpace(PublicKey.fromHex(node.params!.spaceKey)) : undefined;
};

export const SpacePlugin = (): PluginDefinition<SpacePluginProvides> => {
  let onSpaceUpdate: ((node?: SessionNode) => void) | undefined;
  const subscriptions = new EventSubscriptions();
  const spaceSubs = new EventSubscriptions();

  return {
    meta: {
      id: SPACE_PLUGIN,
      shortId: SPACE_PLUGIN_SHORT_ID,
    },
    ready: async (plugins) => {
      const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
      const treeViewPlugin = findPlugin<TreeViewPluginProvides>(plugins, 'dxos.org/plugin/treeview');
      const sessionPlugin = findPlugin<SessionPluginProvides>(plugins, 'dxos.org/plugin/session');
      if (!clientPlugin) {
        return;
      }

      const client = clientPlugin.provides.client;
      subscriptions.add(
        client.spaces.subscribe((spaces) => {
          spaceSubs.clear();
          const spaceIndices = getIndices(spaces.length);
          spaces.forEach((space, index) => {
            const handle = createSubscription(() => {
              onSpaceUpdate?.(spaceToSessionNode(space, spaceIndices[index]));
            });
            handle.update([space.properties]);
            spaceSubs.add(handle.unsubscribe);
          });
          onSpaceUpdate?.();
        }).unsubscribe,
      );

      if (!treeViewPlugin) {
        return;
      }

      const treeView = treeViewPlugin.provides.treeView;

      if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
        client.services.joinedSpace.on((spaceKey) => {
          treeView.active = [spaceKey.toHex()];
        });
      }

      const dispose = effect(() => {
        const space = sessionPlugin?.provides.sessionGraph.nodes[treeView.active[0] as string];
        if (
          space instanceof SpaceProxy &&
          (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost)
        ) {
          client.services.setSpaceProvider(() => space.key);
        }
      });
      subscriptions.add(dispose);
    },
    unload: async () => {
      onSpaceUpdate = undefined;
      spaceSubs.clear();
      subscriptions.clear();
    },
    provides: {
      translations,
      session: {
        resolver: (plugins) => (node: SessionNode) => {
          const client = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client')?.provides.client;
          if (client && isSpaceNode(node)) {
            return resolveSpace(client, node);
          } else {
            return undefined;
          }
        },
      },
      component: (data, role) => {
        switch (role) {
          case 'main':
            switch (true) {
              case isSpace(data):
                return SpaceMainEmpty;
              default:
                return null;
            }
          case 'tree--empty':
            switch (true) {
              case data === SPACE_PLUGIN:
                return EmptyTree;
              // case isSpaceNode(data) && !!resolveSpace(client, data as SpaceNode):
              //   return EmptySpace;
              default:
                return null;
            }
          case 'dialog':
            if (Array.isArray(data)) {
              switch (data[0]) {
                case 'dxos.org/plugin/space/RenameSpaceDialog':
                  return DialogRenameSpace;
                case 'dxos.org/plugin/space/RestoreSpaceDialog':
                  return DialogRestoreSpace;
                default:
                  return null;
              }
            } else {
              return null;
            }
          default:
            return null;
        }
      },
      components: {
        Main: SpaceMain,
      },
      intent: {
        resolver: async (intent, plugins) => {
          const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
          switch (intent.action) {
            case SpaceAction.CREATE: {
              return clientPlugin?.provides.client.createSpace(intent.data);
            }

            case SpaceAction.JOIN: {
              if (clientPlugin) {
                clientPlugin.provides.setLayout(ShellLayout.JOIN_SPACE);
                return true;
              }
              return;
            }

            case 'device-invitations': {
              if (clientPlugin) {
                clientPlugin.provides.setLayout(ShellLayout.DEVICE_INVITATIONS);
                return true;
              }
              return;
            }
          }

          const spaceKey = intent.data?.spaceKey && PublicKey.safeFrom(intent.data.spaceKey);
          if (!spaceKey) {
            return;
          }

          const space = clientPlugin?.provides.client.getSpace(spaceKey);
          switch (intent.action) {
            case SpaceAction.SHARE: {
              if (clientPlugin) {
                clientPlugin.provides.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey });
                return true;
              }
              break;
            }

            case SpaceAction.RENAME: {
              const splitViewPlugin = findPlugin<SplitViewProvides>(plugins, 'dxos.org/plugin/splitview');
              if (space && splitViewPlugin?.provides.splitView) {
                splitViewPlugin.provides.splitView.dialogOpen = true;
                splitViewPlugin.provides.splitView.dialogContent = ['dxos.org/plugin/space/RenameSpaceDialog', space];
                return true;
              }
              break;
            }

            case SpaceAction.CLOSE: {
              void space?.internal.close();
              break;
            }

            case SpaceAction.BACKUP: {
              if (space) {
                // TODO(wittjosiah): Expose translations helper from theme plugin provides.
                const backupBlob = await backupSpace(space, 'untitled document');
                const spaceName = space.properties.name || 'untitled space';
                const url = URL.createObjectURL(backupBlob);
                const element = document.createElement('a');
                element.setAttribute('href', url);
                element.setAttribute('download', `${spaceName} backup.zip`);
                element.setAttribute('target', 'download');
                element.click();
                return true;
              }
              break;
            }

            case SpaceAction.RESTORE: {
              const splitViewPlugin = findPlugin<SplitViewProvides>(plugins, 'dxos.org/plugin/splitview');
              if (space && splitViewPlugin?.provides.splitView) {
                splitViewPlugin.provides.splitView.dialogOpen = true;
                splitViewPlugin.provides.splitView.dialogContent = ['dxos.org/plugin/space/RestoreSpaceDialog', space];
                return true;
              }
              break;
            }

            case SpaceAction.ADD_OBJECT: {
              if (space && intent.data.object) {
                const object = space.db.add(intent.data.object);
                return [space.key.toHex(), object.id];
              }
              break;
            }

            case SpaceAction.REMOVE_OBJECT: {
              const object =
                typeof intent.data.objectId === 'string' ? space?.db.getObjectById(intent.data.objectId) : null;
              if (space && object) {
                space.db.remove(object);
                return true;
              }
              break;
            }
          }
        },
      },
    },
  };
};
