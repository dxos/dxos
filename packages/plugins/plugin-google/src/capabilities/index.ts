//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { translations } from '#translations';

export const Connector = Capability.lazyModule(
  'GoogleConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);
export const MailSend = Capability.lazyModule(
  'GoogleMailSend',
  { provides: [InboxCapabilities.MailSendOperation] },
  () => import('./mail-send'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const Translations = AppCapability.translations(translations);
