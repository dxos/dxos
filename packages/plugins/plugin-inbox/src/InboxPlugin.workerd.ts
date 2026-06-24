//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Event, Message } from '@dxos/types';

import OperationHandler from './capabilities/operation-handler';
import { meta } from '#meta';
import { Calendar, Mailbox } from '#types';

export const InboxPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ id: 'operation-handler', activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Event.Event, Mailbox.Mailbox, Calendar.Calendar, Message.Message],
  }),
  Plugin.make,
);

export default InboxPlugin;
