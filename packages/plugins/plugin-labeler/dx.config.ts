//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';
import { trim } from '@dxos/util';

import { LabelerNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: LabelerNamespace.key,
    name: 'Labeler',
    author: 'DXOS',
    description: trim`
      Labeler tags mailbox messages with the space's own tags. It asks a decision model three
      questions per message — does this need a reply, which label fits, how urgent is it — and
      applies the answers whose confidence clears a threshold, leaving the rest untouched.
      Contributes a toolbar action and a cascade pass to the inbox.
    `,
    icon: { key: 'ph--tag--regular', hue: 'purple' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-labeler',
    tags: ['labs'],
  },
  modules: [
    Capability.lazyModule(
      'MailboxAction',
      // Rides the inbox feature it contributes to: the button is unreachable until a mailbox renders.
      { provides: [InboxCapabilities.MailboxAction], activatesOn: InboxEvents.Start },
      () => import('./src/capabilities/mailbox-action.ts', { with: { type: 'dx-module' } }),
    ),
    Capability.lazyModule(
      'MailboxProcessor',
      { provides: [InboxCapabilities.MailboxProcessor], activatesOn: InboxEvents.Start },
      () => import('./src/capabilities/mailbox-processor.ts', { with: { type: 'dx-module' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'dx-module' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
  ],
});

export const { meta, make } = config;

export default config;
