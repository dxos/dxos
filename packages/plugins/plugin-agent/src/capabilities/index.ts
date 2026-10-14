//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import * as ThreadEvents from '@dxos/plugin-thread/ThreadEvents';

import { translations } from '#translations';

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
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'), {
  environments: ['browser', 'node', 'tauri'],
});
// The members panel that lists invitees is UI; a headless host has none.
export const InviteeSource = Capability.lazyModule(
  'InviteeSource',
  { provides: [AppCapabilities.InviteeSource], environments: ['browser', 'tauri'] },
  () => import('./invitee-source.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.tsx'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const Translations = AppCapability.translations(translations);
