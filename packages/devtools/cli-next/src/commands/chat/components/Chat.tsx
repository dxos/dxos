//
// Copyright 2025 DXOS.org
//

import { useKeyboard } from '@opentui/solid';
import * as Effect from 'effect/Effect';
import { Match, Switch, createEffect, createSignal, useContext } from 'solid-js';

import { type ModelName } from '@dxos/ai';
import { type AiConversation, GenerationObserver } from '@dxos/assistant';
import { log } from '@dxos/log';

import { DXOS_VERSION } from '../../../version';
import { blueprintRegistry } from '../blueprints';
import { useChatMessages } from '../hooks';
import { type ChatProcessor } from '../processor';
import { createAssistantMessage, createUserMessage } from '../types';

import { AppContext } from './App';
import { Banner } from './Banner';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { createJsonBlock } from './Markdown';
import { Picker, type PickerProps } from './Picker';
import { StatusBar } from './StatusBar';

export type ChatProps = {
  processor: ChatProcessor;
  conversation: AiConversation;
  model: ModelName;
  verbose?: boolean;
  onConversationCreate?: ({ blueprints }: { blueprints: string[] }) => void;
};

export const Chat = (props: ChatProps) => {
  const appContext = useContext(AppContext);
  const chatMessages = useChatMessages();
  const verboseMessages = useChatMessages();
  const [inputValue, setInputValue] = createSignal('');
  const [popup, setPopup] = createSignal<'logo' | 'blueprints' | undefined>('logo');
  const [blueprints, setBlueprints] = createSignal<string[]>([]);

  createEffect(() => {
    // Track conversation.
    // TODO(burdon): chatMessages should monitor the queue.
    const _ = props.conversation;
    chatMessages.setMessages({ data: [] });
    verboseMessages.setMessages({ data: [] });
    setBlueprints(props.conversation.context.blueprints.value.map((blueprint) => blueprint.name).sort());
    log.info('xxx', { blueprints: blueprints() });
  });

  // TODO(burdon): Factor out key handling, hints, and dialogs.
  useKeyboard(async (key) => {
    if (key.name === 'b' && key.ctrl) {
      setPopup(popup() === 'blueprints' ? undefined : 'blueprints');
    }
  });

  const handleSubmit = async (value: string) => {
    setPopup(undefined);
    const prompt = value.trim();
    if (!prompt || appContext?.processing()) {
      return;
    }

    const userMessage = createUserMessage(prompt);
    chatMessages.addMessage(userMessage);
    setInputValue('');

    const assistantMessage = createAssistantMessage();
    const assistantIndex = chatMessages.addMessage(assistantMessage);

    let verboseMessage = undefined;
    let verboseIndex = 0;

    try {
      appContext?.setProcessing(true);
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
                    if (block._tag === 'toolResult') {
                      if (!verboseIndex) {
                        verboseMessage = createAssistantMessage();
                        verboseIndex = verboseMessages.addMessage(verboseMessage);
                      }

                      verboseMessages.appendToMessage(
                        verboseIndex,
                        createJsonBlock({ toolCallId: block.toolCallId, name: block.name }),
                      );
                    }
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
      log.catch(err);
      chatMessages.updateMessage(assistantIndex, (message) => {
        message.role = 'error';
        message.content = String(err);
      });
    } finally {
      appContext?.setProcessing(false);
    }
  };

  return (
    <box flexDirection='column'>
      <box flexDirection='column' height='100%' justifyContent='center' alignItems='center' padding={1}>
        <Switch>
          <Match when={popup() === 'blueprints'}>
            <BlueprintPicker
              selected={props.conversation.context.blueprints.value.map((blueprint) => blueprint.key)}
              onSave={(blueprints) => {
                setPopup(undefined);
                log.info('blueprints', { blueprints });
                props.onConversationCreate?.({ blueprints });
              }}
              onCancel={() => setPopup(undefined)}
            />
          </Match>
          <Match when={popup() === 'logo'}>
            <Banner version={DXOS_VERSION} />
          </Match>
          <Match when={popup() === undefined}>
            <box flexDirection='row' width='100%'>
              <box flexDirection='column' flexBasis={2} flexGrow={2}>
                <ChatMessages messages={chatMessages.messages.data} />
              </box>
              {props.verbose && (
                <box flexDirection='column' flexBasis={1} flexGrow={1} paddingLeft={2}>
                  <ChatMessages messages={verboseMessages.messages.data} />
                </box>
              )}
            </box>
          </Match>
        </Switch>
      </box>
      <ChatInput
        focused={() => popup() === 'logo' || popup() === undefined}
        value={inputValue}
        onInput={setInputValue}
        onSubmit={() => handleSubmit(inputValue())}
      />
      <StatusBar
        processing={appContext?.processing}
        model={props.model}
        metadata={props.processor.metadata}
        blueprints={blueprints()}
      />
    </box>
  );
};

type BlueprintPickerProps = Pick<PickerProps, 'selected' | 'onSave' | 'onCancel'>;

const BlueprintPicker = (props: BlueprintPickerProps) => {
  return (
    <Picker
      multi
      title='Select Blueprints'
      items={blueprintRegistry.blueprints.map((blueprint) => ({
        id: blueprint.key,
        label: blueprint.name,
      }))}
      selected={props.selected}
      onSave={(ids) => props.onSave?.(ids)}
      onCancel={() => props.onCancel?.()}
    />
  );
};
