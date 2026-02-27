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
        id: Mailbox.kind,
        metadata: {
          createObject: ((props) => Effect.succeed(Mailbox.make(props))) satisfies CreateObject,
          addToCollectionOnCreate: true,
        },
      },
      {
        id: Calendar.kind,
        metadata: {
          createObject: ((props) => Effect.succeed(Calendar.make(props))) satisfies CreateObject,
          addToCollectionOnCreate: true,
        },
      },
    ],
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({
    schema: [Event.Event, Mailbox.Config, Calendar.Config, Message.Message],
  }),
  Plugin.make,
);
