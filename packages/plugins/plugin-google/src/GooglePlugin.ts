//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { Connector, MailSend, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

/**
 * Headless Google provider: contributes the Gmail / Calendar / Contacts connectors, Gmail's
 * send-routing entry, and every sync, send, materialize and discovery handler. The `Mailbox` and
 * `Calendar` types, all UI, and the mail-sync harness these handlers run against belong to
 * `@dxos/plugin-inbox`.
 */
export const GooglePlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupConnectors,
    activate: Connector,
  }),
  Plugin.addModule({
    id: 'mail-send',
    activatesOn: ActivationEvents.Startup,
    activate: MailSend,
  }),
  Plugin.make,
);

export default GooglePlugin;
