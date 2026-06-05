//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { Channel, Message, Thread } from '@dxos/types';

import { CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { ThreadOperation } from '#types';

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Channel.Channel, Message.Message, Thread.Thread],
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(ThreadOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.make,
);

export default ThreadPlugin;
