//
// Copyright 2025 DXOS.org
//

import { useKeyboard } from '@opentui/solid';
import * as Effect from 'effect/Effect';
import { For, Match, Switch, createEffect, createSignal, onCleanup, useContext } from 'solid-js';

import { type ModelName } from '@dxos/ai';
import { type AiConversation, GenerationObserver } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { AppContext } from '../../../components';
import { theme } from '../../../theme';
import { DXOS_VERSION } from '../../../version';
import { blueprintRegistry } from '../blueprints';
import { useChatMessages } from '../hooks';
import { type ChatProcessor } from '../processor';
import { createAssistantMessage, createUserMessage } from '../types';

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
  const [inputValue, setInputValue] = createSignal('');
  const [popup, setPopup] = createSignal<'logo' | 'blueprints' | undefined>('logo');

  // Conversation state.
  const chatMessages = useChatMessages();
  const infoMessages = useChatMessages();
  const [blueprints, setBlueprints] = createSignal<string[]>([]);
  const [objects, setObjects] = createSignal<Obj.Any[]>([]);

  createEffect(() => {
    // Monitor conversation change.
    props.conversation;

    // TODO(burdon): chatMessages should monitor the queue.
    // TODO(burdon): List conversations.
    chatMessages.setMessages({ data: [] });
    infoMessages.setMessages({ data: [] });
  });

  createEffect(() => {
    // Bridge Preact signals to Solid signals.
    const onUpdate = () => {
      setBlueprints(props.conversation.context.blueprints.value.map((blueprint) => blueprint.name).sort());
      setObjects(props.conversation.context.objects.value);
    };

    const unsubscribeBlueprints = props.conversation.context.blueprints.subscribe(onUpdate);
    const unsubscribeObjects = props.conversation.context.objects.subscribe(onUpdate);
    onCleanup(() => {
      unsubscribeBlueprints();
      unsubscribeObjects();
    });
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
                        verboseIndex = infoMessages.addMessage(verboseMessage);
                      }

                      infoMessages.appendToMessage(
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
              <box flexDirection='column'>
                <ChatMessages messages={chatMessages.messages.data} />
              </box>
              <box flexDirection='column' width={40} paddingLeft={2}>
                <box flexDirection='column' flexShrink={0}>
                  {objects().length > 0 && <text style={{ fg: theme.log.info }}>Artifacts:</text>}
                  <box flexDirection='column' marginTop={1} marginBottom={1}>
                    <For each={objects()}>{(object) => <text>- {Obj.getLabel(object) ?? object.id}</text>}</For>
                  </box>
                </box>
                {props.verbose && (
                  <box flexDirection='column' flexGrow={1}>
                    <ChatMessages messages={infoMessages.messages.data} />
                  </box>
                )}
              </box>
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
