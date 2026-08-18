//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import { setRef } from '@dxos/react-ui';
import {
  type FeedModel,
  type FeedNavigation,
  MessageList,
  type ScrollToOptions,
  useMessageList,
} from '@dxos/react-ui-feed';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';

import { type CreateRendererOptions, createRenderer, estimateRow } from '../../renderer';
import { assistantRegistry } from '../../registry';
import { type ChatThreadEvent, type ChatView } from '../../types';
import { MessageChrome, MessageChromeProvider } from '../MessageChrome';

//
// Context
//

const CHAT_THREAD_NAME = 'ChatThread';

type ChatThreadContextValue = {
  userHue?: string;
  onEvent?: (event: ChatThreadEvent) => void;
};

const [ChatThreadProvider, useChatThreadContext] = createContext<ChatThreadContextValue>(CHAT_THREAD_NAME);

//
// Controller
//

/**
 * The imperative handle a host drives the thread through — the successor of the old
 * `MarkdownStreamController`, shrunk to what a message-indexed feed still needs: everything else
 * (visible range, spans, widget state) is either context or the model's own business.
 */
export type ChatThreadController = {
  model: FeedModel;
  scrollToBottom: (options?: ScrollToOptions) => void;
  scrollToIndex: (index: number, options?: ScrollToOptions) => void;
  /** The one seam every navigation driver shares: toolbar, arrows, rails. */
  navigation: FeedNavigation;
};

/** Bridges the feed's context out to the host's ref; renders nothing. */
const ControllerBridge = ({ controllerRef }: { controllerRef: Ref<ChatThreadController> }) => {
  const { model, scrollToBottom, scrollToIndex, navigation } = useMessageList('ChatThread.Controller');
  useEffect(() => {
    setRef(controllerRef, { model, scrollToBottom, scrollToIndex, navigation });
    return () => {
      setRef(controllerRef, null);
    };
  }, [controllerRef, model, scrollToBottom, scrollToIndex, navigation]);

  return null;
};

//
// Root
//

type ChatThreadRootProps = PropsWithChildren<
  CreateRendererOptions & {
    /** The thread's model. `useFeedModel(messages, { stops: 'prompt' })` adapts an array host. */
    model: FeedModel;
    viewType?: ChatView;
    /** Extends {@link assistantRegistry}; the host's entries win (e.g. a real `surface` widget). */
    registry?: XmlWidgetRegistry;
    /** The reader's identity hue, published to the DOM for the prompt frame's tokens. */
    userHue?: string;
    debug?: boolean;
    onEvent?: (event: ChatThreadEvent) => void;
    controllerRef?: Ref<ChatThreadController>;
  }
>;

/**
 * Headless root: the feed's `MessageList.Root` configured as an assistant thread — the view-typed
 * renderer, the widget registry, the prompt/answer chrome, and the chat behaviours (follow the
 * streaming tail; reserve room to bring the last prompt to the top). Composes with the feed's own
 * parts: `MessageList.Nav`, `useMessageList`, and the rails all work inside it.
 */
const ChatThreadRoot = ({
  children,
  model,
  viewType,
  registry,
  getObjectLabel,
  userHue,
  debug,
  onEvent,
  controllerRef,
}: ChatThreadRootProps) => {
  const renderer = useMemo(() => createRenderer(viewType, { getObjectLabel }), [viewType, getObjectLabel]);
  const merged = useMemo(() => (registry ? { ...assistantRegistry, ...registry } : assistantRegistry), [registry]);
  const handleRewind = useCallback((id: string) => onEvent?.({ type: 'rewind', id }), [onEvent]);

  return (
    <ChatThreadProvider userHue={userHue} onEvent={onEvent}>
      <MessageChromeProvider onRewind={onEvent ? handleRewind : undefined}>
        <MessageList.Root
          model={model}
          renderer={renderer}
          registry={merged}
          Chrome={MessageChrome}
          estimateSize={estimateRow}
          debug={debug}
          stickyBottom
          scrollPastEnd
        >
          {controllerRef && <ControllerBridge controllerRef={controllerRef} />}
          {children}
        </MessageList.Root>
      </MessageChromeProvider>
    </ChatThreadProvider>
  );
};

ChatThreadRoot.displayName = 'ChatThread.Root';

//
// Viewport
//

const CHAT_THREAD_VIEWPORT_NAME = 'ChatThread.Viewport';

type ChatThreadViewportProps = ComponentPropsWithoutRef<typeof MessageList.Viewport>;

/**
 * The scrolling thread. Suggestion and select widgets are DOM widgets carrying
 * `data-action="submit"` buttons; one delegated listener here turns those clicks into `submit`
 * events, which is what keeps the widgets renderable from the tag alone.
 */
const ChatThreadViewport = ({ children, ...props }: ChatThreadViewportProps) => {
  const { userHue, onEvent } = useChatThreadContext(CHAT_THREAD_VIEWPORT_NAME);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action="submit"]');
      const text = action?.getAttribute('data-value');
      if (text) {
        event.preventDefault();
        event.stopPropagation();
        onEvent?.({ type: 'submit', text });
      }
    },
    [onEvent],
  );

  return (
    <div className='contents' data-testid='assistant.thread' data-hue={userHue} onClickCapture={handleClick}>
      <MessageList.Viewport {...props}>{children}</MessageList.Viewport>
    </div>
  );
};

ChatThreadViewport.displayName = CHAT_THREAD_VIEWPORT_NAME;

//
// ChatThread
//

export const ChatThread = {
  Root: ChatThreadRoot,
  Viewport: ChatThreadViewport,
};

export type { ChatThreadRootProps, ChatThreadViewportProps };
