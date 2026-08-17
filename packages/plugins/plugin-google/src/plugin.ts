//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

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
  Plugin.addModule(Connector),
  Plugin.addModule(MailSend),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default GooglePlugin;
