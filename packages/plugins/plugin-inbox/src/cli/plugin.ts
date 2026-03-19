//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { type CreateObject, SpaceOperation } from '@dxos/plugin-space/types';
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
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Mailbox.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Calendar.Calendar.typename,
        metadata: {
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Calendar.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
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
