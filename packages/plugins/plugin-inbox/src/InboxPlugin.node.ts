//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Event, Message } from '@dxos/types';

import { CreateObject, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

import * as Calendar from './types/Calendar';
import * as Mailbox from './types/Mailbox';

// TODO(wittjosiah): Factor out shared modules.

export const InboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Event.Event, Mailbox.Mailbox, Calendar.Calendar, Message.Message])),
  Plugin.make,
);

export default InboxPlugin;
