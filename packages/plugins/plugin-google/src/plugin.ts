//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Connector, MailSend, OperationHandler, Translations } from '#capabilities';
import { meta } from '#meta';

/**
 * Headless Google provider: contributes the Gmail / Calendar / Contacts connectors, Gmail's
 * send-routing entry, and every sync, send, materialize and discovery handler. The `Mailbox` and
 * `Calendar` types, all UI, and the mail-sync harness these handlers run against belong to
 * `@dxos/plugin-inbox`.
 */
export const GooglePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Connector),
  Plugin.addModule(MailSend),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default GooglePlugin;
