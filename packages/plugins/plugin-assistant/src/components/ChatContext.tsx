//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type Event } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { type Obj } from '@dxos/echo';
import { type DataType } from '@dxos/schema';

import { type AiChatProcessor } from '../processor';
import { type Assistant } from '../types';

/**
 * The main `ChatRoot` manages the `ChatContextValue` which contains an `event` property that subcomponents
 * can subscribe to and submit events. Unhandled events are passed to the `onEvent` callback.
 */
export type ChatEvent =
  | {
      type: 'toggle-debug';
    }
  //
  // Thread
  //
  | {
      type: 'submit';
      text: string;
    }
  | {
      type: 'retry';
    }
  | {
      type: 'cancel';
    }
  | {
      type: 'delete';
      id: string;
    }
  | {
      type: 'add';
      object: Obj.Any;
    }
  //
  // UX
  //
  | {
      type: 'update-prompt';
      text: string;
    }
  | {
      type: 'scroll-to-bottom';
    }
  | {
      type: 'thread-open';
    }
  | {
      type: 'thread-close';
    }
  | {
      type: 'record-start';
    }
  | {
      type: 'record-stop';
    };

type ChatContextValue = {
  debug?: boolean;
  event: Event<ChatEvent>;
  space: Space;
  chat: Assistant.Chat;
  messages: DataType.Message[];
  processor: AiChatProcessor;
};

const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');

export { ChatContextProvider, useChatContext };

export type { ChatContextValue };
