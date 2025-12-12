//
// Copyright 2025 DXOS.org
//

import { useKeyboard } from '@opentui/solid';
import * as Effect from 'effect/Effect';
import { Match, Switch, createSignal, useContext } from 'solid-js';

import { type ModelName } from '@dxos/ai';
import { type AiConversation, GenerationObserver } from '@dxos/assistant';

import { useChatMessages } from '../hooks';
import { type ChatProcessor } from '../processor';
import { createAssistantMessage, createUserMessage } from '../types';

import { DXOS_VERSION } from '../../../version';
import { blueprintRegistry } from '../blueprints';
import { AppContext } from './App';
import { Banner } from './Banner';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { Picker, type PickerProps } from './Picker';
import { StatusBar } from './StatusBar';

// TODO(burdon): Show/select blueprints/objects.

export type ChatProps = {
  processor: ChatProcessor;
  conversation: AiConversation;
  model: ModelName;
  verbose?: boolean;
  onConversationCreate?: ({ blueprints }: { blueprints: string[] }) => void;
};

export const Chat = (props: ChatProps) => {
  const context = useContext(AppContext);
  const chatMessages = useChatMessages();
  const [inputValue, setInputValue] = createSignal('');
  const [popup, setPopup] = createSignal<'logo' | 'blueprints' | undefined>('logo');

  // TODO(burdon): Factor out key handling, hints, and dialogs.
  useKeyboard((key) => {
    if (key.name === 'b' && key.ctrl) {
      setPopup(popup() === 'blueprints' ? undefined : 'blueprints');
    }
  });

  const handleSubmit = async (value: string) => {
    setPopup(undefined);
    const prompt = value.trim();
    if (!prompt || context?.processing()) {
      return;
    }

    const userMessage = createUserMessage(prompt);
    chatMessages.addMessage(userMessage);
    setInputValue('');

    const assistantMessage = createAssistantMessage();
    const assistantIndex = chatMessages.addMessage(assistantMessage);

    try {
      context?.setProcessing(true);
      const observer = GenerationObserver.make({
        onPart: (part) =>
          Effect.sync(() => {
            if (part.type === 'text-delta') {
              chatMessages.appendToMessage(assistantIndex, part.delta);
            }
          }),
        onMessage: (message) =>
          Effect.sync(() => {
            switch (message.sender.role) {
              case 'tool': {
                if (props.verbose) {
                  for (const block of message.blocks) {
                    chatMessages.appendToMessage(assistantIndex, ['```json', JSON.stringify(block), '```'].join('\n'));
                  }
                }
                break;
              }
            }
          }),
      });

      // Create and execute request.
      const request = props.conversation.createRequest({ prompt, observer });
      await props.processor.execute(request, props.model);
    } catch (err: any) {
      chatMessages.updateMessage(assistantIndex, (message) => {
        message.role = 'error';
        message.content = String(err);
      });
    } finally {
      context?.setProcessing(false);
    }
  };

  return (
    <box flexDirection='column'>
      <box padding={1} height='100%' justifyContent='center' alignItems='center'>
        <Switch>
          <Match when={popup() === 'blueprints'}>
            <BlueprintPicker
              onConfirm={(ids) => {
                setPopup(undefined);
                props.onConversationCreate?.({ blueprints: ids });
              }}
              onCancel={() => setPopup(undefined)}
            />
          </Match>
          <Match when={popup() === 'logo'}>
            <Banner version={DXOS_VERSION} />
          </Match>
          <Match when={popup() === undefined}>
            <ChatMessages messages={chatMessages.messages.data} />
          </Match>
        </Switch>
      </box>
      <ChatInput
        value={inputValue}
        onInput={setInputValue}
        onSubmit={() => handleSubmit(inputValue())}
        focused={() => popup() === 'logo' || popup() === undefined}
      />
      {/* TODO(burdon): Show blueprints in status bar. */}
      <StatusBar model={props.model} metadata={props.processor.metadata} processing={context?.processing} />
    </box>
  );
};

type BlueprintPickerProps = Pick<PickerProps, 'onConfirm' | 'onCancel'>;

const BlueprintPicker = (props: BlueprintPickerProps) => {
  return (
    <Picker
      multi
      title='Select Blueprints'
      items={blueprintRegistry.blueprints.map((blueprint) => ({ id: blueprint.key, label: blueprint.name }))}
      onConfirm={(ids) => props.onConfirm?.(ids)}
      onCancel={() => props.onCancel?.()}
    />
  );
};
