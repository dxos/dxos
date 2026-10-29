//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { meta } from '#meta';
import { translations } from '#translations';
import { MessengerCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  requires: [MessengerCapabilities.NotificationsContainers],
});

// Headless: invitations must be stored (and toasted) whether or not the panel was ever opened, so
// this rides the space list rather than the plugin's own UI.
export const InboxMaterializer = Capability.lazyModule(
  'InboxMaterializer',
  {
    requires: [Capabilities.AtomRegistry, Capabilities.OperationInvoker, ClientCapabilities.Client],
    provides: [MessengerCapabilities.NotificationsContainers],
    activatesOn: ClientEvents.SpacesAvailable,
    environments: ['browser', 'tauri'],
  },
  () => import('./inbox-materializer.ts'),
);

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});

export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});

// Headless: a device that opted in re-registers on every start, whether or not settings are ever opened.
export const PushNotifications = Capability.lazyModule(
  'PushNotifications',
  {
    requires: [Capabilities.AtomRegistry, ClientCapabilities.Client],
    provides: [AppCapabilities.PushNotifications],
    activatesOn: ClientEvents.SpacesAvailable,
    environments: ['browser', 'tauri'],
  },
  () => import('./push-notifications.ts'),
);

export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.deckCompanion.messenger', 'org.dxos.role.article'],
});

export const Schema = AppCapability.schema(() => import('./schema.ts'));

export const Sender = Capability.lazyModule(
  'Sender',
  {
    requires: [ClientCapabilities.Client],
    provides: [MessengerCapabilities.Sender],
    activatesOn: ClientEvents.Initialized,
    environments: ['browser', 'tauri'],
  },
  () => import('./sender.ts'),
);

export const Translations = AppCapability.translations(translations);
