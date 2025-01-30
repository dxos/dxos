//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { ObjectId } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { create } from '@dxos/live-object';
import { SpaceId } from '@dxos/react-client/echo';

import { AutomationAction, GptChatType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver(AutomationAction.Create, ({ name }) => ({
      data: {
        object: create(GptChatType, {
          name,
          queue: new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, SpaceId.random(), ObjectId.random()]).toString(),
        }),
      },
    })),
  );
