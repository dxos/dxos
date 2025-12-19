//
// Copyright 2025 DXOS.org
//

import { type SetStoreFunction, createStore, produce } from 'solid-js/store';

import { type Message } from '../types';

export type MessagesStore = {
  data: Message[];
};

export type ChatMessagesControls = {
  messages: MessagesStore;
  setMessages: SetStoreFunction<MessagesStore>;
  addMessage: (message: Message) => number;
  updateMessage: (index: number, updater: (msg: Message) => void) => void;
  appendToMessage: (index: number, content: string) => void;
};

/**
 * Custom hook for managing chat messages.
 */
export const useChatMessages = (): ChatMessagesControls => {
  const [messages, setMessages] = createStore<MessagesStore>({ data: [] });

  const addMessage = (message: Message): number => {
    const index = messages.data.length;
    setMessages('data', index, message);
    return index;
  };

  const updateMessage = (index: number, updater: (msg: Message) => void) => {
    setMessages('data', index, produce(updater));
  };

  const appendToMessage = (index: number, content: string) => {
    updateMessage(index, (msg) => {
      msg.content += content;
    });
  };

  return {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    appendToMessage,
  };
};
