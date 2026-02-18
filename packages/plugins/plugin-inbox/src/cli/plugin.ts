//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ClientCapabilities } from '@dxos/plugin-client/types';
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
          createObject: ((props, { db }) =>
            Effect.gen(function* () {
              const client = yield* Capability.get(ClientCapabilities.Client);
              const space = client.spaces.get(db.spaceId);
              return Mailbox.make({ ...props, space });
            })) satisfies CreateObject,
          addToCollectionOnCreate: true,
        },
      },
      {
        id: Calendar.Calendar.typename,
        metadata: {
          createObject: ((props, { db }) =>
            Effect.gen(function* () {
              const client = yield* Capability.get(ClientCapabilities.Client);
              const space = client.spaces.get(db.spaceId);
              return Calendar.make({ ...props, space });
            })) satisfies CreateObject,
          addToCollectionOnCreate: true,
        },
      },
    ],
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({
    schema: [Calendar.Calendar, Event.Event, Mailbox.Mailbox, Message.Message],
  }),
  Plugin.make,
);
