//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { Connector, MailSend, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

/**
 * Headless mail provider: contributes the JMAP connector, its send-routing entry, and the sync/send/
 * materialize handlers. Every UI surface, the `Mailbox` type, and the sync harness these handlers run
 * against belong to `@dxos/plugin-inbox`.
 */
export const JmapPlugin = Plugin.define(meta).pipe(
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

export default JmapPlugin;
