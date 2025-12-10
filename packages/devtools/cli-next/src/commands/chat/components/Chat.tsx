//
// Copyright 2025 DXOS.org
//

import { useRenderer } from '@opentui/solid';
import * as Effect from 'effect/Effect';
import { createSignal, onMount } from 'solid-js';

import { type ModelName } from '@dxos/ai';
import { type AiConversation, GenerationObserver } from '@dxos/assistant';

import { DXOS_VERSION } from '../../../version';
import { useChatKeyboard, useChatMessages } from '../hooks';
import { type ChatProcessor } from '../processor';
import { theme } from '../theme';
import { createAssistantMessage, createUserMessage } from '../types';

import { Banner } from './Banner';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { StatusBar } from './StatusBar';

export type ChatProps = {
  processor: ChatProcessor;
  conversation: AiConversation;
  model: ModelName;
  verbose?: boolean;
  showConsole?: boolean;
};

export const Chat = ({ processor, conversation, model, verbose, showConsole }: ChatProps) => {
  const chatMessages = useChatMessages();
  const [showBanner, setShowBanner] = createSignal(true);
  const [inputValue, setInputValue] = createSignal('');
  const [streaming, setStreaming] = createSignal(false);
  const [focusedElement, setFocusedElement] = createSignal<'input' | 'messages'>('input');
  useChatKeyboard(setFocusedElement);

  const renderer = useRenderer();
  if (showConsole) {
    renderer.useConsole = true;
    renderer.console.show();
  }

  onMount(() => {
    renderer.setBackgroundColor(theme.bg);
  });

  const handleSubmit = async (value: string) => {
    const prompt = value.trim();
    if (!prompt || streaming()) {
      return;
    }

    if (showBanner()) {
      setShowBanner(false);
    }

    const userMessage = createUserMessage(prompt);
    chatMessages.addMessage(userMessage);
    setInputValue('');

    const assistantMessage = createAssistantMessage();
    const assistantIndex = chatMessages.addMessage(assistantMessage);

    try {
      setStreaming(true);
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
                if (verbose) {
                  // for (const part of message.blocks) {
                  // TODO(burdon): Add tool call.
                  // }
                }
                break;
              }
            }
          }),
      });

      // Create and execute request.
      const request = conversation.createRequest({ prompt, observer });
      await processor.execute(request, model);
    } catch (err) {
      chatMessages.updateMessage(assistantIndex, (message) => {
        message.role = 'error';
        message.content = `Error: ${String(err)}`;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <box flexDirection='column' height='100%' width='100%'>
      <box flexGrow={1} position='relative'>
        {showBanner() && <Banner version={DXOS_VERSION} />}
        <ChatMessages messages={chatMessages.messages.data} />
      </box>

      <ChatInput
        value={inputValue}
        onInput={setInputValue}
        onSubmit={() => handleSubmit(inputValue())}
        focused={focusedElement() === 'input'}
      />

      <StatusBar model={model} metadata={processor.metadata} processing={streaming} />
    </box>
  );
};
