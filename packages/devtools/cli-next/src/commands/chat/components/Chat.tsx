//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { createSignal, useContext } from 'solid-js';

import { type ModelName } from '@dxos/ai';
import { type AiConversation, GenerationObserver } from '@dxos/assistant';
import { log } from '@dxos/log';

import { useChatMessages } from '../hooks';
import { type ChatProcessor } from '../processor';
import { createAssistantMessage, createUserMessage } from '../types';

import { AppContext } from './App';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { StatusBar } from './StatusBar';

export type ChatProps = {
  processor: ChatProcessor;
  conversation: AiConversation;
  model: ModelName;
  verbose?: boolean;
};

export const Chat = (props: ChatProps) => {
  const context = useContext(AppContext);
  const chatMessages = useChatMessages();
  const [inputValue, setInputValue] = createSignal('');

  const handleSubmit = async (value: string) => {
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
        // onMessage: (message) =>
        //   Effect.sync(() => {
        //     switch (message.sender.role) {
        //       case 'tool': {
        //         if (props.verbose) {
        //           for (const part of message.blocks) {
        //           }
        //         }
        //         break;
        //       }
        //     }
        //   }),
      });

      // Create and execute request.
      const request = props.conversation.createRequest({ prompt, observer });
      await props.processor.execute(request, props.model);
    } catch (err) {
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
      <box padding={1}>
        <ChatMessages messages={chatMessages.messages.data} />
      </box>
      <ChatInput value={inputValue} onInput={setInputValue} onSubmit={() => handleSubmit(inputValue())} />
      <StatusBar model={props.model} metadata={props.processor.metadata} processing={context?.processing} />
    </box>
  );
};
