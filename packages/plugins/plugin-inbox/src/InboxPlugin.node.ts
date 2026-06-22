//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Event, Message } from '@dxos/types';

import { BlueprintDefinition, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Calendar, Mailbox } from '#types';

// TODO(wittjosiah): Factor out shared modules.

export const InboxPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Event.Event, Mailbox.Mailbox, Calendar.Calendar, Message.Message],
  }),
  Plugin.make,
);

export default InboxPlugin;
