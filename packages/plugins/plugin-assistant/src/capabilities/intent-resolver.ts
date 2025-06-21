//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Blueprint } from '@dxos/assistant';
import { Obj, Ref } from '@dxos/echo';

import { AssistantAction, AIChatType } from '../types';

export default () => [
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: AssistantAction.CreateChat,
      resolve: ({ space, name }) => ({
        data: {
          object: Obj.make(AIChatType, {
            name,
            queue: Ref.fromDXN(space.queues.create().dxn),
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
          object: Obj.make(Blueprint, { name, steps: [] }),
        },
      }),
    }),
  ),
];
