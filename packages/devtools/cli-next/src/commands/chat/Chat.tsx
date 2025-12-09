//
// Copyright 2025 DXOS.org
//

import { useKeyboard, useRenderer } from '@opentui/solid';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Runtime from 'effect/Runtime';
import { Match, Show, Switch, createSignal } from 'solid-js';

import { AiService, type ModelName } from '@dxos/ai';
import { type AiConversation, type AiConversationRunParams } from '@dxos/assistant';
import { throwCause } from '@dxos/effect';

import { type AiChatServices } from './types';

// https://github.com/sst/opentui/blob/main/packages/solid/examples/repro-onSubmit.tsx

type ChatProps = {
  conversation: AiConversation;
  runtime: Runtime.Runtime<AiChatServices>;
  model: ModelName;
};

export const Chat = ({ conversation, runtime, model }: ChatProps) => {
  console.log('props', { conversation, runtime, model });
  const renderer = useRenderer();

  renderer.useConsole = true;
  renderer.console.show();

  const [sig, setS] = createSignal(0);

  useKeyboard((key) => {
    if (key.name === 'tab') {
      setS((s) => (s + 1) % 3);
    }
  });

  const onSubmit = () => {
    console.log('input');
  };

  const request = async (params: AiConversationRunParams) => {
    const request = conversation.createRequest(params);
    const fiber = request.pipe(Effect.provide(AiService.model(model)), Effect.asVoid, Runtime.runFork(runtime));

    const response = await fiber.pipe(Fiber.join, Effect.runPromiseExit);
    if (!Exit.isSuccess(response) && !Cause.isInterruptedOnly(response.cause)) {
      throwCause(response.cause);
    }
  };

  return (
    <box border title='input'>
      <Switch>
        <Match when={sig() === 0}>
          <box border title='input 0' height={3}>
            <input
              focused
              placeholder='input0'
              // onSubmit={onSubmit}
              onSubmit={() => {
                console.log('input 0');
              }}
            />
          </box>
        </Match>
        <Match when={sig() === 1}>
          <Show when={sig() > 0}>
            <box border title='input 1' height={3}>
              <input
                focused
                placeholder='input1'
                // onSubmit={onSubmit}
                onSubmit={() => {
                  console.log('input 1');
                }}
              />
            </box>
          </Show>
        </Match>
        <Match when={sig() === 2}>
          <box border title='input 2' height={3}>
            <input
              focused
              placeholder='input2'
              // onSubmit={onSubmit}
              onSubmit={() => {
                console.log('input 2');
              }}
            />
          </box>
        </Match>
      </Switch>
    </box>
  );
};
