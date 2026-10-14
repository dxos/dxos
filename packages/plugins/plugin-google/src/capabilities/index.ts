//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';

import { translations } from '#translations';

export const Connector = Capability.lazyModule(
  'GoogleConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector.ts'),
);
export const MailSend = Capability.lazyModule(
  'GoogleMailSend',
  // Read by the inbox compose/reply views and by the assistant's send skill.
  {
    provides: [InboxCapabilities.MailSendOperation],
    activatesOn: ActivationEvent.oneOf(InboxEvents.Start, AppActivationEvents.AssistantStart),
  },
  () => import('./mail-send.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const Translations = AppCapability.translations(translations);
