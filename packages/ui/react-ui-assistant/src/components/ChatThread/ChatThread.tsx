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
  useState,
} from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import {
  type FeedModel,
  MessageList,
  type MessageListController,
  type MessageRange,
  useMessageList,
} from '@dxos/react-ui-feed';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';

import { assistantRegistry } from '../../registry.tsx';
import { type CreateRendererOptions, createRenderer, estimateRow } from '../../renderer.ts';
import { translationKey } from '../../translations.ts';
import { type ChatThreadEvent, type ChatView } from '../../types.ts';
import { MessageChrome, MessageChromeProvider } from '../MessageChrome/index.ts';

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
 * `MarkdownStreamController`, and simply the feed's own controller: everything else (visible
 * range, spans, widget state) is either context or the model's business.
 */
export type ChatThreadController = MessageListController;

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
    /** Blank lines kept below the tail at rest — breathing room above the host's composer. */
    tailLines?: number;
    debug?: boolean;
    onEvent?: (event: ChatThreadEvent) => void;
    /** The visible index range, as the reader scrolls — what an outline rail tracks. */
    onRangeChange?: (range: MessageRange) => void;
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
  tailLines,
  debug,
  onEvent,
  onRangeChange,
  controllerRef,
}: ChatThreadRootProps) => {
  const renderer = useMemo(() => createRenderer(viewType, { getObjectLabel }), [viewType, getObjectLabel]);
  // Debug shows the raw document: with no registry the tags stay visible as the text they are.
  const merged = useMemo(
    () => (viewType === 'debug' ? undefined : registry ? { ...assistantRegistry, ...registry } : assistantRegistry),
    [registry, viewType],
  );
  const handleRewind = useCallback((id: string) => onEvent?.({ type: 'rewind', id }), [onEvent]);

  // While an answer streams, the chrome keeps its toolbars hidden — a control on a half-written
  // answer invites acting on it, and the hover reveal moving with the growing rows reads as noise.
  const [streaming, setStreaming] = useState(!!model.streamingId);
  useEffect(() => {
    setStreaming(!!model.streamingId);
    return model.subscribe(() => setStreaming(!!model.streamingId));
  }, [model]);

  return (
    <ChatThreadProvider userHue={userHue} onEvent={onEvent}>
      <MessageChromeProvider
        onRewind={onEvent ? handleRewind : undefined}
        streaming={streaming}
        showContext={viewType !== 'summary'}
        debug={debug}
      >
        <MessageList.Root
          model={model}
          renderer={renderer}
          registry={merged}
          Chrome={MessageChrome}
          estimateSize={estimateRow}
          debug={debug}
          stickyBottom
          tailLines={tailLines}
          onRangeChange={onRangeChange}
          controllerRef={controllerRef}
        >
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
const ChatThreadViewport = ({ children, classNames, overlay, ...props }: ChatThreadViewportProps) => {
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
      {/* Every chat host is a flex column with a composer below: the scroll-container pair is the
          default, and a caller's classNames extend or override it. */}
      <MessageList.Viewport
        {...props}
        classNames={['dx-grow', classNames]}
        overlay={
          <>
            <ScrollToBottom />
            {overlay}
          </>
        }
      >
        {children}
      </MessageList.Viewport>
    </div>
  );
};

ChatThreadViewport.displayName = CHAT_THREAD_VIEWPORT_NAME;

//
// ScrollToBottom
//

const CHAT_THREAD_SCROLL_TO_BOTTOM_NAME = 'ChatThread.ScrollToBottom';

/**
 * Returns the reader to the tail, and re-arms the follow with it (`scrollToBottom` does both).
 *
 * Hidden by opacity rather than unmounted, because a control leaving the layout would move the
 * scroller's own box — which the placement measures; `disabled` and `aria-hidden` then keep the
 * invisible button out of the focus order and off the accessibility tree.
 */
const ScrollToBottom = () => {
  const { t } = useTranslation(translationKey);
  const { atEnd, scrollToBottom } = useMessageList(CHAT_THREAD_SCROLL_TO_BOTTOM_NAME);

  return (
    <IconButton
      icon='ph--arrow-down--regular'
      iconOnly
      label={t('scroll-to-bottom.label')}
      variant='primary'
      size={4}
      disabled={atEnd}
      aria-hidden={atEnd}
      classNames={[
        'absolute bottom-2 right-4 z-10 transition-opacity duration-300',
        atEnd && 'opacity-0 pointer-events-none',
      ]}
      data-testid='assistant.thread.scroll-to-bottom'
      onClick={() => scrollToBottom({ behavior: 'smooth' })}
    />
  );
};

ScrollToBottom.displayName = CHAT_THREAD_SCROLL_TO_BOTTOM_NAME;

//
// ChatThread
//

export const ChatThread = {
  Root: ChatThreadRoot,
  Viewport: ChatThreadViewport,
  ScrollToBottom,
};

export type { ChatThreadRootProps, ChatThreadViewportProps };
