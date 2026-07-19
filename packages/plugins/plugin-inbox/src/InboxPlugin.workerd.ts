//
// Copyright 2026 DXOS.org
//

import { Capabilities, Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Event, Message } from '@dxos/types';

import { meta } from '#meta';
import { Calendar, Mailbox } from '#types';

import OperationHandler from './capabilities/operation-handler';

export const InboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'operation-handler',
    requires: [],
    provides: [Capabilities.OperationHandler],
    activate: OperationHandler,
  }),
  Plugin.addLazyModule(AppCapability.schema([Event.Event, Mailbox.Mailbox, Calendar.Calendar, Message.Message])),
  Plugin.make,
);

export default InboxPlugin;
