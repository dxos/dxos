//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { ObjectId } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { create, refFromDXN } from '@dxos/live-object';

import { AutomationAction, AIChatType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: AutomationAction.CreateChat,
      resolve: ({ spaceId, name }) => ({
        data: {
          object: create(AIChatType, {
            name,
            queue: refFromDXN(new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, ObjectId.random()])),
          }),
        },
      }),
    }),
  );
