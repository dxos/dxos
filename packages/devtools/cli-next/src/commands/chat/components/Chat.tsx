//
// Copyright 2025 DXOS.org
//

import { useKeyboard } from '@opentui/solid';
import * as Effect from 'effect/Effect';
import { For, Match, Switch, createEffect, createSignal, onCleanup, useContext } from 'solid-js';

import { type ModelName } from '@dxos/ai';
import { type AiConversation, GenerationObserver } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { type Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Assistant } from '@dxos/plugin-assistant/types';
import { isTruthy } from '@dxos/util';

import { DXOS_VERSION } from '../../../version';
import { blueprintRegistry } from '../blueprints';
import { useChatMessages } from '../hooks';
import { type ChatProcessor } from '../processor';
import { theme } from '../theme';
import { createAssistantMessage, createUserMessage } from '../types';

import { AppContext } from './App';
import { Banner } from './Banner';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { createJsonBlock } from './Markdown';
import { Picker, type PickerProps } from './Picker';
import { StatusBar } from './StatusBar';

export type ChatProps = {
  db: Database.Database;
  processor: ChatProcessor;
  conversation: AiConversation;
  model: ModelName;
  verbose?: boolean;
  onChatSelect?: (chat: Assistant.Chat) => void;
  onChatCreate?: ({ blueprints }: { blueprints: string[] }) => void;
};

export const Chat = (props: ChatProps) => {
  const appContext = useContext(AppContext);
  const [inputValue, setInputValue] = createSignal('');
  const [popup, setPopup] = createSignal<'logo' | 'blueprints' | 'chats' | undefined>('logo');

  // Conversation state.
  const chatMessages = useChatMessages();
  const infoMessages = useChatMessages();
  const [blueprints, setBlueprints] = createSignal<Blueprint.Blueprint[]>([]);
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
      setBlueprints(
        props.conversation.context.blueprints.value
          .map((blueprint) => blueprintRegistry.getByKey(blueprint.key))
          .filter(isTruthy),
      );
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

    if (key.name === 'f' && key.ctrl) {
      setPopup(popup() === 'chats' ? undefined : 'chats');
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
      <box flexDirection='column' height='100%' padding={1} justifyContent='center' alignItems='center'>
        <Switch>
          <Match when={popup() === 'logo'}>
            <Banner version={DXOS_VERSION} />
          </Match>
          <Match when={popup() === 'chats'}>
            <ChatPicker
              db={props.db}
              onSave={(chat) => {
                props.onChatSelect?.(chat);
                setPopup(undefined);
              }}
              onCancel={() => setPopup(undefined)}
            />
          </Match>
          <Match when={popup() === 'blueprints'}>
            <BlueprintPicker
              selected={props.conversation.context.blueprints.value.map((blueprint) => blueprint.key)}
              onSave={(blueprints) => {
                props.onChatCreate?.({ blueprints });
                setPopup(undefined);
              }}
              onCancel={() => setPopup(undefined)}
            />
          </Match>
          <Match when={popup() === undefined}>
            <box flexDirection='row' width='100%'>
              <box flexDirection='column'>
                <ChatMessages messages={chatMessages.messages.data} />
              </box>
              <box flexDirection='column' width={40} paddingLeft={2}>
                <Blueprints blueprints={blueprints()} />
                <Artifacts objects={objects()} />
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
        blueprints={blueprints().map((blueprint) => blueprint.name)}
      />
    </box>
  );
};

const Blueprints = (props: { blueprints: Blueprint.Blueprint[] }) => {
  return (
    <box flexDirection='column' flexShrink={0}>
      {props.blueprints.length > 0 && <text style={{ fg: theme.text.primary }}>Blueprints</text>}
      <box flexDirection='column' marginTop={1} marginBottom={1}>
        <For each={props.blueprints}>{(blueprint) => <text>- {blueprint.name}</text>}</For>
      </box>
    </box>
  );
};

const Artifacts = (props: { objects: Obj.Any[] }) => {
  return (
    <box flexDirection='column' flexShrink={0}>
      {props.objects.length > 0 && <text style={{ fg: theme.text.primary }}>Artifacts</text>}
      <box flexDirection='column' marginTop={1} marginBottom={1}>
        <For each={props.objects}>
          {(object) => (
            <box flexDirection='column'>
              <text>
                {'- '}
                {Obj.getLabel(object) ?? object.id}
              </text>
              <text style={{ fg: theme.text.subdued }}>
                {'  '}({Obj.getTypename(object)})
              </text>
            </box>
          )}
        </For>
      </box>
    </box>
  );
};

const BlueprintPicker = (props: Pick<PickerProps, 'selected' | 'onSave' | 'onCancel'>) => {
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

const ChatPicker = (
  props: { db: Database.Database; onSave?: (chat: Assistant.Chat) => void } & Pick<PickerProps, 'onCancel'>,
) => {
  const [chats, setChats] = createSignal<Assistant.Chat[]>([]);

  createEffect(async () => {
    const chats = await props.db.query(Filter.type(Assistant.Chat)).run();
    setChats(chats);
  });

  return (
    <Picker
      title='Select Conversations'
      items={chats().map((chat) => ({
        id: chat.id,
        label: chat.name ?? chat.id,
      }))}
      onSave={(ids) => {
        const chat = chats().find((chat) => chat.id === ids[0]);
        if (chat) {
          props.onSave?.(chat);
        } else {
          props.onCancel?.();
        }
      }}
      onCancel={() => props.onCancel?.()}
    />
  );
};
