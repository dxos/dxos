//
// Copyright 2025 DXOS.org
//
import { useKeyboard } from '@opentui/solid';
import * as Effect from 'effect/Effect';
import { Match, Switch, createSignal, useContext } from 'solid-js';

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
  const verboseMessages = useChatMessages();
  const [inputValue, setInputValue] = createSignal('');
  const [popup, setPopup] = createSignal<'logo' | 'blueprints' | undefined>('logo');

  // TODO(burdon): Factor out key handling, hints, and dialogs.
  useKeyboard(async (key) => {
    if (key.name === 'b' && key.ctrl) {
      setPopup(popup() === 'blueprints' ? undefined : 'blueprints');
    }

    // TODO(burdon): Remove once debugged: blueprints are always empty.
    if (key.name === 'a' && key.ctrl) {
      const conversation = await props.conversation.open();
      log.info('blueprints', { blueprints: conversation.blueprints.map((blueprint) => blueprint.toString()) });
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

    let verboseMessage = undefined;
    let verboseIndex = 0;

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
                  // TODO(burdon): Create Right-panel for tool results.
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
        value={inputValue}
        onInput={setInputValue}
        onSubmit={() => handleSubmit(inputValue())}
        focused={() => popup() === 'logo' || popup() === undefined}
      />
      <StatusBar
        model={props.model}
        metadata={props.processor.metadata}
        // TODO(burdon): This doesn't update.
        blueprints={props.conversation.blueprints.map((blueprint) => blueprint.name)}
        processing={context?.processing}
      />
    </box>
  );
};

type BlueprintPickerProps = Pick<PickerProps, 'onConfirm' | 'onCancel'>;

const BlueprintPicker = (props: BlueprintPickerProps) => {
  return (
    <Picker
      multi
      title='Select Blueprints'
      items={blueprintRegistry.blueprints.map((blueprint) => ({
        id: blueprint.key,
        label: blueprint.name,
      }))}
      onConfirm={(ids) => props.onConfirm?.(ids)}
      onCancel={() => props.onCancel?.()}
    />
  );
};

const createJsonBlock = (content: any) => {
  return ['```json', JSON.stringify(content, null, 2), '```', ''].join('\n');
};
