//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { ObjectId } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { live } from '@dxos/live-object';

import { AssistantAction, AIChatType, TemplateType } from '../types';

export default () => [
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: AssistantAction.CreateChat,
      resolve: ({ spaceId, name }) => ({
        data: {
          object: live(AIChatType, {
            assistantChatQueue: Ref.fromDXN(
              new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, ObjectId.random()]),
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
