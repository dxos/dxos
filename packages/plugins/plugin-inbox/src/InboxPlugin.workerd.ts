//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Event, Message } from '@dxos/types';

import { meta } from '#meta';
import { Calendar, Mailbox } from '#types';

import OperationHandler from './capabilities/operation-handler';

const OperationHandlerModule = Capability.inlineModule(
  'operation-handler',
  { provides: [Capabilities.OperationHandler] },
  OperationHandler,
);

export const InboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandlerModule),
  Plugin.addModule(AppCapability.schema([Event.Event, Mailbox.Mailbox, Calendar.Calendar, Message.Message])),
  Plugin.make,
);

export default InboxPlugin;
