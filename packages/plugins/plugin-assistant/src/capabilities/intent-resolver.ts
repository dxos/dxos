//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Sequence } from '@dxos/conductor';
import { Key, Obj, Ref } from '@dxos/echo';

import { Assistant, AssistantAction } from '../types';

export default () => [
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: AssistantAction.CreateChat,
      resolve: ({ space, name }) => ({
        data: {
          object: Obj.make(Assistant.Chat, {
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
      intent: AssistantAction.CreateSequence,
      resolve: ({ name }) => ({
        data: {
          object: Obj.make(Sequence, {
            name,
            steps: [
              {
                id: Key.ObjectId.random(),
                instructions: 'You are a helpful assistant.',
              },
            ],
          }),
        },
      }),
    }),
  ),
];
