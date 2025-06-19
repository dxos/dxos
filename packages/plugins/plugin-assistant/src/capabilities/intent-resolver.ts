//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { BlueprintType } from '@dxos/assistant';
import { createQueueDxn } from '@dxos/echo-schema';
import { live, refFromDXN } from '@dxos/live-object';

import { AssistantAction, AIChatType } from '../types';

export default () => [
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: AssistantAction.CreateChat,
      resolve: ({ space, name }) => ({
        data: {
          object: live(AIChatType, {
            name,
            queue: refFromDXN(createQueueDxn(space.id)),
          }),
        },
      }),
    }),
  ),
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: AssistantAction.CreateBlueprint,
      resolve: ({ name }) => ({
        data: {
          object: live(BlueprintType, { name, steps: [] }),
        },
      }),
    }),
  ),
];
