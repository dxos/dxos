//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { Result, useRxValue } from '@effect-rx/rx-react';
import { createContext } from '@radix-ui/react-context';
import { Array, Option } from 'effect';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Event } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useVoiceInput } from '@dxos/plugin-transcription';
import { type Space, fullyQualifiedId, getSpace, useQueue } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Input, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ChatEditor, type ChatEditorController, type ChatEditorProps, references } from '@dxos/react-ui-chat';
import { type ScrollController } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { type AiChatProcessor, useReferencesProvider } from '../../hooks';
import { meta } from '../../meta';
import { type Assistant } from '../../types';
import {
  ChatActions,
  type ChatActionsProps,
  ChatOptions,
  type ChatPresetsProps,
  ChatReferences,
  ChatStatusIndicator,
} from '../ChatPrompt';
import { ChatThread as NativeChatThread, type ChatThreadProps as NativeChatThreadProps } from '../ChatThread';

import { type ChatEvent } from './events';

//
// Context
// NOTE: The context should not be exported. It is only used internally.
// Components outside of this Radix-style group shuld define their own APIs.
//

type ChatContextValue = {
  debug?: boolean;
  event: Event<ChatEvent>;
  space: Space;
  chat: Assistant.Chat;
  messages: DataType.Message[];
  processor: AiChatProcessor;
};

// NOTE: Do not export.
const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');

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
// Prompt
//

type ChatPromptProps = ThemedClassName<
  {
    outline?: boolean;
  } & Pick<ChatEditorProps, 'placeholder'> &
    Omit<ChatPresetsProps, 'onChange'> & {
      expandable?: boolean;
      online?: boolean;
      // TODO(thure): The convention for the names of handlers throughout the repo is meant to be `on{noun}{event}` in order to align with Radix. As an example of the `change` event, search the repo for the regex `on\w+Change`.
      onChangeOnline?: (online: boolean) => void;
      // TODO(thure): Ditto here.
      onChangePreset?: ChatPresetsProps['onChange'];
    }
>;

const ChatPrompt = ({
  classNames,
  outline,
  placeholder,
  expandable,
  online,
  presets,
  preset,
  onChangePreset,
  onChangeOnline,
}: ChatPromptProps) => {
  const { t } = useTranslation(meta.id);
  const { space, chat, event, processor } = useChatContext(ChatPrompt.displayName);

  const streaming = useRxValue(processor.streaming);
  const error = useRxValue(processor.error).pipe(Option.getOrUndefined);

  const [active, setActive] = useState(false);
  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'record-start':
          setActive(true);
          break;
        case 'record-stop':
          setActive(false);
          break;
      }
    });
  }, [event]);

  const editorRef = useRef<ChatEditorController>(null);

  // TODO(burdon): Configure capability in TranscriptionPlugin.
  const { recording } = useVoiceInput({
    active,
    onUpdate: (text) => {
      editorRef.current?.setText(text);
      editorRef.current?.focus();
    },
  });

  // TODO(burdon): Reconcile with object tags.
  const referencesProvider = useReferencesProvider(space);
  const extensions = useMemo<Extension[]>(() => {
    return [
      referencesProvider && references({ provider: referencesProvider }),
      Prec.highest(
        keymap.of(
          [
            {
              key: 'cmd-d',
              preventDefault: true,
              run: () => {
                event.emit({ type: 'toggle-debug' });
                return true;
              },
            },
            expandable && {
              key: 'cmd-ArrowUp',
              preventDefault: true,
              run: () => {
                event.emit({ type: 'thread-open' });
                return true;
              },
            },
            expandable && {
              key: 'cmd-ArrowDown',
              preventDefault: true,
              run: () => {
                event.emit({ type: 'thread-close' });
                return true;
              },
            },
          ].filter(isNotFalsy),
        ),
      ),
    ].filter(isNotFalsy);
  }, [event, expandable, referencesProvider]);

  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      if (!streaming) {
        event.emit({ type: 'submit', text });
        return true;
      }
    },
    [streaming, event],
  );

  const handleEvent = useCallback<NonNullable<ChatActionsProps['onEvent']>>(
    (ev) => {
      event.emit(ev);
    },
    [event],
  );

  return (
    <div
      className={mx(
        'is-full flex flex-col',
        outline && [
          'p-2 bg-groupSurface border border-transparent rounded',
          '[&:has(div:focus)]:border-transparent [&:has(div:focus)]:outline outline-neutralFocusIndicator',
        ],
        classNames,
      )}
    >
      <div className='flex gap-2'>
        <div className='p-1'>
          <ChatStatusIndicator preset={preset} error={error} processing={streaming} />
        </div>

        <ChatEditor
          id={fullyQualifiedId(chat)}
          ref={editorRef}
          autoFocus
          lineWrapping
          classNames='col-span-2 pbs-0.5'
          placeholder={placeholder ?? t('prompt placeholder')}
          extensions={extensions}
          onSubmit={handleSubmit}
        />
      </div>

      <div className='flex pbs-2 items-center'>
        <ChatOptions
          space={space}
          blueprintRegistry={processor.blueprintRegistry}
          context={processor.context}
          preset={preset}
          presets={presets}
          onPresetChange={onChangePreset}
        />

        <div role='none' className='pli-cardSpacingChrome grow'>
          <ChatReferences space={space} context={processor.context} />
        </div>

        <ChatActions
          classNames='col-span-2'
          microphone={true}
          recording={recording}
          processing={streaming}
          onEvent={handleEvent}
        >
          {online !== undefined && (
            <Input.Root>
              <Input.Switch classNames='mis-2 mie-2' checked={online} onCheckedChange={onChangeOnline} />
            </Input.Root>
          )}
        </ChatActions>
      </div>
    </div>
  );
};

ChatPrompt.displayName = 'Chat.Prompt';

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
  Prompt: ChatPrompt,
  Thread: ChatThread,
};

export type { ChatRootProps, ChatThreadProps, ChatPromptProps, ChatEvent };
