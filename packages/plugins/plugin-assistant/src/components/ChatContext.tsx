//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type Event } from '@dxos/async';
import { type Space } from '@dxos/react-client/echo';
import { type DataType } from '@dxos/schema';

import { type AiChatProcessor } from '../hooks';
import { type Assistant, type ChatEvent } from '../types';

// TODO(burdon): Inject via effect layer.
export type ChatContextValue = {
  debug?: boolean;
  event: Event<ChatEvent>;
  space: Space;
  chat: Assistant.Chat;
  processor: AiChatProcessor;
  messages: DataType.Message[];
};

const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');

export { ChatContextProvider, useChatContext };
