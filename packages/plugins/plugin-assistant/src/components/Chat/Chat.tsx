//
// Copyright 2025 DXOS.org
//

import { Result, useRxValue } from '@effect-rx/rx-react';
import { Array } from 'effect';
import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import { Event } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { getSpace, useQueue } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import { type ScrollController } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';

import { type ChatEvent } from '../../types';
import { ChatContextProvider, type ChatContextValue, useChatContext } from '../ChatContext';
import { ChatPrompt, type ChatPromptProps } from '../ChatPrompt';
import { ChatThread as NativeChatThread, type ChatThreadProps as NativeChatThreadProps } from '../ChatThread';

//
// Root
//

type ChatRootProps = ThemedClassName<
  PropsWithChildren<
    Pick<ChatContextValue, 'chat' | 'processor'> & {
      onEvent?: (event: ChatEvent) => void;
    }
  >
>;

const ChatRoot = ({ classNames, children, chat, processor, onEvent, ...props }: ChatRootProps) => {
  const [debug, setDebug] = useState(false);
  const space = getSpace(chat);

  // Messages.
  const queue = useQueue<DataType.Message>(chat?.queue.dxn);
  const pending = useRxValue(processor.messages);
  const streaming = useRxValue(processor.streaming);

  const messages = useMemo(() => {
    const queueMessages = queue?.objects?.filter(Obj.instanceOf(DataType.Message)) ?? [];
    return Result.match(pending, {
      onInitial: () => queueMessages,
      onSuccess: (pending) => Array.dedupeWith([...queueMessages, ...pending.value], (a, b) => a.id === b.id),
      onFailure: () => queueMessages,
    });
  }, [queue?.objects, pending]);

  // TODO(burdon): Replace with tool to select artifact.
  // const { dispatchPromise: dispatch } = useIntentDispatcher();
  // useEffect(() => {
  //   if (!processor?.streaming.value && queue?.objects) {
  //     const message = queue.objects[queue.objects.length - 1];
  //     if (dispatch && space && chat && message) {
  //       void dispatch(
  //         createIntent(CollaborationActions.InsertContent, {
  //           target: artifact,
  //           object: Ref.fromDXN(new DXN(DXN.kind.QUEUE, [...chat.queue.dxn.parts, message.id])),
  //           label: 'View proposal',
  //         }),
  //       );
  //     }
  //   }
  // }, [queue, processor?.streaming.value]);

  // Events.
  const event = useMemo(() => new Event<ChatEvent>(), []);
  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'toggle-debug': {
          setDebug((current) => {
            const debug = !current;
            log.info('toggle-debug', { debug });
            // log.config({ filter: debug ? 'assistant:debug' : 'info' });
            return debug;
          });
          break;
        }

        case 'submit': {
          if (!streaming) {
            void processor.request(event.text);
          }
          break;
        }

        case 'cancel': {
          void processor.cancel();
          break;
        }

        default: {
          onEvent?.(event);
        }
      }
    });
  }, [event, onEvent, processor, streaming]);

  if (!space) {
    return null;
  }

  return (
    <ChatContextProvider
      debug={debug}
      event={event}
      chat={chat}
      space={space}
      processor={processor}
      messages={messages}
      {...props}
    >
      <div role='none' className={mx('flex flex-col h-full overflow-hidden', classNames)}>
        {children}
      </div>
    </ChatContextProvider>
  );
};

ChatRoot.displayName = 'Chat.Root';

//
// Thread
//

type ChatThreadProps = Omit<NativeChatThreadProps, 'identity' | 'space' | 'messages' | 'tools' | 'onEvent'>;

const ChatThread = (props: ChatThreadProps) => {
  const { debug, event, space, messages } = useChatContext(ChatThread.displayName);
  const identity = useIdentity();

  const scrollerRef = useRef<ScrollController>(null);
  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'submit':
        case 'scroll-to-bottom':
          scrollerRef.current?.scrollToBottom('smooth');
          break;
      }
    });
  }, [event]);

  if (!identity) {
    return null;
  }

  return (
    <NativeChatThread
      {...props}
      ref={scrollerRef}
      debug={debug}
      identity={identity}
      space={space}
      messages={messages}
      onEvent={(ev) => event.emit(ev)}
    />
  );
};

ChatThread.displayName = 'Chat.Thread';

//
// Chat
//

export const Chat = {
  Root: ChatRoot,
  Thread: ChatThread,
  Prompt: ChatPrompt,
};

export type { ChatRootProps, ChatThreadProps, ChatPromptProps, ChatEvent };
