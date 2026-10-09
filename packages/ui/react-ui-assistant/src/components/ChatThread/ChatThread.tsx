//
// Copyright 2026 DXOS.org
//

import React, {
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type FeedModel,
  MessageList,
  type MessageListController,
  type MessageRange,
  useMessageList,
} from '@dxos/react-ui-feed';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import { type ObjectLinkProps, type WidgetDef, type XmlWidgetRegistry } from '@dxos/ui-editor';

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
  viewType?: ChatView;
  onEvent?: (event: ChatThreadEvent) => void;
};

const [ChatThreadProvider, useChatThreadContext] = Hooks.createContext<ChatThreadContextValue>(CHAT_THREAD_NAME);

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
    /** The block widget for an object embedded as a card (`![label](echo://…)`); the host's, since only it can render one. */
    objectImage?: WidgetDef<ObjectLinkProps>;
    /** The reader's identity hue, published to the DOM for the prompt frame's tokens. */
    userHue?: string;
    /** Blank lines kept below the tail at rest — breathing room above the host's composer. */
    tailLines?: number;
    debug?: boolean;
    /** Offers rewind under each prompt; off for an agent that cannot forget a turn. */
    rewind?: boolean;
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
/** Debug's registry: identity-stable, since the feed caches its extensions per registry. */
const DEBUG_REGISTRY: XmlWidgetRegistry = {};

const ChatThreadRoot = ({
  children,
  model,
  viewType,
  registry,
  objectImage,
  getObjectLabel,
  userHue,
  tailLines,
  debug,
  rewind = true,
  onEvent,
  onRangeChange,
  controllerRef,
}: ChatThreadRootProps) => {
  const renderer = useMemo(() => createRenderer(viewType, { getObjectLabel }), [viewType, getObjectLabel]);
  // Debug shows the raw document: an empty registry renders no widgets, so the tags stay visible as
  // the text they are, but still highlighted as tags.
  const merged = useMemo(
    () => (viewType === 'debug' ? DEBUG_REGISTRY : { ...assistantRegistry, ...registry }),
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
    <ChatThreadProvider userHue={userHue} viewType={viewType} onEvent={onEvent}>
      <MessageChromeProvider
        onRewind={onEvent && rewind ? handleRewind : undefined}
        streaming={streaming}
        showContext={viewType !== 'summary'}
        debug={debug}
        userHue={userHue}
      >
        <MessageList.Root
          model={model}
          renderer={renderer}
          registry={merged}
          objectImage={objectImage}
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
  const { userHue, viewType, onEvent } = useChatThreadContext(CHAT_THREAD_VIEWPORT_NAME);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const action = target.closest<HTMLElement>('[data-action]');
      const value = action?.getAttribute('data-value');
      const threadEvent = value ? toThreadEvent(action?.getAttribute('data-action'), value) : undefined;
      if (threadEvent) {
        event.preventDefault();
        event.stopPropagation();
        onEvent?.(threadEvent);
        return;
      }

      const response = target.closest<HTMLElement>('[data-action="respond"]');
      const messageId = response?.getAttribute('data-message');
      const requestId = response?.getAttribute('data-request');
      const optionId = response?.getAttribute('data-option');
      if (messageId && requestId && optionId) {
        event.preventDefault();
        event.stopPropagation();
        onEvent?.({ type: 'respond', messageId, requestId, optionId });
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
        classNames={[
          'dx-grow',
          // Debug's raw tags and toolkit JSON are reference text, set smaller than the prose around them.
          viewType === 'debug' && '[&_.cm-codeblock-line]:text-sm [&_.cm-xml-tag]:text-sm',
          classNames,
        ]}
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

/** A widget's `data-action` button as the event it stands for; the value is the text or the message id. */
const toThreadEvent = (action: string | null | undefined, value: string): ChatThreadEvent | undefined => {
  switch (action) {
    case 'submit':
      return { type: 'submit', text: value };
    case 'remove':
      return { type: 'remove-prompt', id: value };
    default:
      return undefined;
  }
};

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
  const { t } = Hooks.useTranslation(translationKey);
  const { atEnd, following, scrollToBottom } = useMessageList(CHAT_THREAD_SCROLL_TO_BOTTOM_NAME);
  // Hidden while the list follows the tail itself: a streaming turn outruns the glide a frame at a
  // time, and `atEnd` alone would blink the button through every response.
  const hidden = atEnd || following;

  return (
    <Button.Root
      variant='primary'
      icon='ph--arrow-line-down--regular'
      iconOnly
      size='lg'
      label={t('scroll-to-bottom.label')}
      disabled={hidden}
      aria-hidden={hidden}
      classNames={[
        'absolute bottom-2 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-300',
        hidden && 'opacity-0 pointer-events-none',
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
