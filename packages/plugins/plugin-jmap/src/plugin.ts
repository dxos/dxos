//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Connector, MailSend, OperationHandler, Translations } from '#capabilities';
import { meta } from '#meta';

/**
 * Headless mail provider: contributes the JMAP connector, its send-routing entry, and the sync/send/
 * materialize handlers. Every UI surface, the `Mailbox` type, and the sync harness these handlers run
 * against belong to `@dxos/plugin-inbox`.
 */
export const JmapPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Connector),
  Plugin.addModule(MailSend),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default JmapPlugin;
