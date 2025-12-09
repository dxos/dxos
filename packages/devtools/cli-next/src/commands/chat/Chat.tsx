//
// Copyright 2025 DXOS.org
//

import { useRenderer } from '@opentui/solid';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Runtime from 'effect/Runtime';
import { createSignal, onMount } from 'solid-js';

import { AiService, type ModelName } from '@dxos/ai';
import { type AiConversation, type AiConversationRunParams, GenerationObserver } from '@dxos/assistant';
import { throwCause } from '@dxos/effect';

import { ChatBanner } from './ChatBanner';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { ChatStatusBar } from './ChatStatusBar';
import { useChatKeyboard, useChatMessages, useSpinner } from './hooks';
import { type AiChatServices, createAssistantMessage, createUserMessage } from './types';

const DEBUG = false;

type ChatProps = {
  conversation: AiConversation;
  runtime: Runtime.Runtime<AiChatServices>;
  model: ModelName;
};

export const Chat = ({ conversation, runtime, model }: ChatProps) => {
  const chatMessages = useChatMessages();
  const [isStreaming, setIsStreaming] = createSignal(false);
  const [inputValue, setInputValue] = createSignal('');
  const [showBanner, setShowBanner] = createSignal(true);
  const [focusedElement, setFocusedElement] = createSignal<'input' | 'messages'>('input');

  const spinner = useSpinner();
  useChatKeyboard(setFocusedElement);

  const renderer = useRenderer();
  if (DEBUG) {
    renderer.useConsole = true;
    renderer.console.show();
  }

  onMount(() => {
    renderer.setBackgroundColor('#000000');
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
      spinner.start();

      const observer = GenerationObserver.make({
        onPart: (part) =>
          Effect.sync(() => {
            if (part.type === 'text-delta') {
              chatMessages.appendToMessage(assistantIndex, part.delta);
            }
          }),
      });

      await executeAiRequest(conversation, runtime, model, {
        prompt,
        observer,
      });
    } catch (err) {
      chatMessages.updateMessage(assistantIndex, (msg) => {
        msg.role = 'error';
        msg.content = `Error: ${String(err)}`;
      });
    } finally {
      spinner.stop();
      setIsStreaming(false);
    }
  };

  return (
    <box flexDirection='column' height='100%' width='100%'>
      <box flexGrow={1} position='relative'>
        <ChatBanner visible={showBanner} />
        <ChatMessages messages={chatMessages.messages.data} />
      </box>

      <ChatInput
        value={inputValue}
        onInput={setInputValue}
        onSubmit={() => handleSubmit(inputValue())}
        focused={focusedElement() === 'input'}
      />

      <ChatStatusBar isStreaming={isStreaming} spinnerFrame={spinner.frame} model={model} />
    </box>
  );
};

const executeAiRequest = async (
  conversation: AiConversation,
  runtime: Runtime.Runtime<AiChatServices>,
  model: ModelName,
  params: AiConversationRunParams,
): Promise<void> => {
  const request = conversation.createRequest(params);
  const fiber = request.pipe(Effect.provide(AiService.model(model)), Effect.asVoid, Runtime.runFork(runtime));

  const response = await fiber.pipe(Fiber.join, Effect.runPromiseExit);
  if (!Exit.isSuccess(response) && !Cause.isInterruptedOnly(response.cause)) {
    throwCause(response.cause);
  }
};
