//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import * as ThreadEvents from '@dxos/plugin-thread/ThreadEvents';

import { translations } from '#translations';
import { AgentCapabilities } from '#types';

export const Brain = AppCapability.layerSpec(() => import('./brain.ts'), {
  name: 'Brain',
  environments: ['browser', 'node', 'tauri'],
});
// Not on EDGE: connecting claims the address through the app's client, and EDGE never connects a channel.
export const EmailChannelBackend = Capability.lazyModule(
  'EmailChannelBackend',
  {
    provides: [ThreadCapabilities.ChannelBackend],
    activatesOn: ThreadEvents.Start,
    environments: ['browser', 'node', 'tauri'],
  },
  () => import('./email-channel-backend.ts'),
);
// EDGE's mailboxes over the client's EDGE HTTP client (`EdgeHttpClientService`), which plugin-client provides.
export const AgentMailbox = AppCapability.layerSpec(() => import('./agent-mailbox.ts'), {
  name: 'AgentMailbox',
  environments: ['browser', 'node', 'tauri'],
});
// Follows the members panel's admissions, which only the app makes; a headless host adds no members.
export const AgentAdmission = Capability.lazyModule(
  'AgentAdmission',
  {
    requires: [Capabilities.OperationInvoker, ClientCapabilities.Client],
    provides: [],
    environments: ['browser', 'tauri'],
  },
  () => import('./agent-admission.ts'),
);
// Keeps EDGE's lists of the admins of the agents this identity administers in step with their spaces, which only the
// app shows; a headless host administers no agent. plugin-client provides the EDGE HTTP client only once the client
// initializes, so requiring it keeps the sync from activating before then and finding no EDGE to tell.
export const AgentAdminSync = Capability.lazyModule(
  'AgentAdminSync',
  {
    requires: [ClientCapabilities.Client, ClientCapabilities.EdgeHttpClient],
    provides: [],
    environments: ['browser', 'tauri'],
  },
  () => import('./agent-admin-sync.ts'),
);
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.tsx'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const Settings = AppCapability.settings(() => import('./settings.ts'), {
  activatesOn: ActivationEvents.Idle,
  provides: [AgentCapabilities.Settings],
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const Translations = AppCapability.translations(translations);
