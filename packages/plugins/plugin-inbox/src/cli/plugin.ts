//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { type CreateObject } from '@dxos/plugin-space/types';
import { Event, Message } from '@dxos/types';

import { OperationResolver } from '../capabilities/operation-resolver';
import { meta } from '../meta';
import { Calendar, Mailbox } from '../types';

// TODO(wittjosiah): Factor out shared modules.
export const InboxPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Mailbox.Mailbox.typename,
        metadata: {
          createObject: ((props) => Effect.sync(() => Mailbox.make(props))) satisfies CreateObject,
          addToCollectionOnCreate: true,
        },
      },
      {
        id: Calendar.Calendar.typename,
        metadata: {
          createObject: ((props) => Effect.sync(() => Calendar.make(props))) satisfies CreateObject,
          addToCollectionOnCreate: true,
        },
      },
    ],
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({
    schema: [Event.Event, Mailbox.Mailbox, Calendar.Calendar, Message.Message],
  }),
  Plugin.make,
);
