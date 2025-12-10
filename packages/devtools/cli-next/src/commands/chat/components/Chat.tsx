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
import { ChatStatusBar } from './ChatStatusBar';

// TODO(burdon): CLI option.
const DEBUG = false;

export type ChatProps = {
  processor: ChatProcessor;
  conversation: AiConversation;
  model: ModelName;
};

export const Chat = ({ processor, conversation, model }: ChatProps) => {
  const chatMessages = useChatMessages();
  const [showBanner, setShowBanner] = createSignal(true);
  const [inputValue, setInputValue] = createSignal('');
  const [isStreaming, setIsStreaming] = createSignal(false);
  const [focusedElement, setFocusedElement] = createSignal<'input' | 'messages'>('input');

  useChatKeyboard(setFocusedElement);
  const renderer = useRenderer();
  if (DEBUG) {
    renderer.useConsole = true;
    renderer.console.show();
  }

  onMount(() => {
    renderer.setBackgroundColor(theme.bg);
  });

  const handleSubmit = async (value: string) => {
    const prompt = value.trim();
    if (!prompt || isStreaming()) {
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
      setIsStreaming(true);
      const observer = GenerationObserver.make({
        onPart: (part) =>
          Effect.sync(() => {
            if (part.type === 'text-delta') {
              chatMessages.appendToMessage(assistantIndex, part.delta);
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
      setIsStreaming(false);
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

      <ChatStatusBar isStreaming={isStreaming} model={model} metadata={processor.metadata} />
    </box>
  );
};
