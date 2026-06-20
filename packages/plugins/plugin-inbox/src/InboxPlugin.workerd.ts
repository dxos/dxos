//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Event, Message } from '@dxos/types';

import { MailServices, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Calendar, Mailbox } from '#types';

export const InboxPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  // Until the live IMAP/SMTP transport is complete (see ImapConnection.fetchBody) and a
  // function-bundle deploy path sets `deployedId`, Workers also bind the fail-fast sentinels
  // so mail operations resolve cleanly rather than dying on a missing service.
  Plugin.addModule({
    id: 'MailServices',
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: MailServices,
  }),
  AppPlugin.addSchemaModule({
    schema: [Event.Event, Mailbox.Mailbox, Calendar.Calendar, Message.Message],
  }),
  Plugin.make,
);

export default InboxPlugin;
