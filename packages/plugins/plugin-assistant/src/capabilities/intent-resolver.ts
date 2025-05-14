//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { live, refFromDXN } from '@dxos/live-object';

import { AssistantAction, AIChatType, TemplateType } from '../types';

export default () => [
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: AssistantAction.CreateChat,
      resolve: ({ spaceId, name }) => ({
        data: {
          object: live(AIChatType, {
            assistantChatQueue: refFromDXN(
              new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, Type.ObjectId.random()]),
            ),
          }),
        },
      }),
    }),
  ),
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: AssistantAction.CreateTemplate,
      resolve: ({ name }) => ({
        data: {
          object: live(TemplateType, { name, kind: { include: 'manual' }, source: '{{! Template }}' }),
        },
      }),
    }),
  ),
];
