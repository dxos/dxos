//
// Copyright 2026 DXOS.org
//

import React, { type RefObject, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { type SpaceMember } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { ScrollArea, type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import {
  type MessageMetadata,
  MessageTextbox,
  Thread as ThreadComponent,
  type ThreadRootProps,
  threadLayout,
} from '@dxos/react-ui-thread';
import { type Message } from '@dxos/types';
import { createBasicExtensions, createThemeExtensions, listener, type Extension } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

import { command } from '../../extensions';
import { getMessageMetadata } from '../../util';
import { MessagePanel } from '../MessagePanel';

export type ChatProps = ThemedClassName<
  {
    /** Stable id used for the underlying thread root and message metadata. */
    id: string;
    /** Identity used to attribute outgoing messages in the textbox metadata. */
    identity?: Identity;
    /** Space members for rendering sender names/avatars on incoming messages. */
    members: SpaceMember[];
    /** Messages to render in order. */
    messages: readonly Message.Message[];
    /** Activity indicator (e.g. processing) shown beneath the textbox. */
    activity?: boolean;
    /**
     * Called with the user's textbox content when they press send.
     * Returning `true` signals the message was accepted; the textbox is then cleared.
     */
    onSend: (text: string) => boolean;
    autoFocusTextbox?: boolean;
    /**
     * Where the composer sits relative to the messages.
     * - `'top'` (default) — composer follows the messages at intrinsic height,
     *   suitable for inline comment threads.
     * - `'bottom'` — composer pinned to the bottom of the panel, messages
     *   scrolling above it. Suitable for full-panel multi-party chat.
     */
    orientation?: ChatOrientation;
    /**
     * When true, hide the composer textbox and activity indicator. Used for
     * channels whose source-of-truth lives elsewhere (e.g. externally-synced
     * Slack/Discord channels keyed by a foreign id) — sending isn't meaningful
     * because there is no local-write path back to the source.
     */
    readOnly?: boolean;
  } & Pick<ThreadRootProps, 'current'>
>;

export type ChatOrientation = 'top' | 'bottom';

/**
 * Pure chat UI: scrollable message list + composer textbox + activity indicator.
 * Owns its own UI state (textbox content, scroll position, editor extensions) but
 * does not load data or invoke operations — the caller passes messages and an
 * `onSend` callback. Used by both `ThreadArticle` (AutoMerge `Thread`) and
 * `ChannelArticle`'s feed-backed channel chat.
 */
export const Chat = composable<HTMLDivElement, ChatProps>(
  (
    {
      id,
      identity,
      members,
      messages,
      activity,
      autoFocusTextbox,
      current,
      orientation = 'top',
      readOnly,
      onSend,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const [autoFocus, setAutoFocus] = useState(autoFocusTextbox);

    // Force the editor to remount after a successful send so its content resets.
    const [_count, _setCount] = useState(0);

    const textboxMetadata = getMessageMetadata(id, identity);
    const messageRef = useRef('');
    const extensions = useMemo(
      () => [
        createBasicExtensions({ placeholder: t('message.placeholder') }),
        createThemeExtensions({ themeMode }),
        listener({ onChange: ({ text }) => (messageRef.current = text) }),
        command,
      ],
      [themeMode, _count],
    );

    const scrollToEnd = (behavior: ScrollBehavior) =>
      setTimeout(() => sentinelRef.current?.scrollIntoView({ behavior, block: 'end' }), 10);

    useLayoutEffect(() => {
      scrollToEnd('instant');
    }, []);

    // NOTE: Auto-scroll on new messages is intentionally not implemented here. Smooth-scroll
    // animations were causing ResizeObserver feedback loops with CodeMirror/ScrollArea. The
    // proper fix is "scroll only if user is already at the bottom" — deferred to a follow-up.

    const handleSend = () => {
      const text = messageRef.current;
      if (!text?.length) {
        return false;
      }

      const accepted = onSend(text);
      if (!accepted) {
        return false;
      }

      messageRef.current = '';
      setAutoFocus(true);
      scrollToEnd('smooth');
      _setCount((count) => count + 1);
      return true;
    };

    const filteredMessages = messages.filter(isNonNullable);
    const renderState: ChatRenderState = {
      messages: filteredMessages,
      members,
      activity,
      extensions,
      autoFocus,
      handleSend,
      textboxMetadata,
      scrollRef,
      sentinelRef,
      readOnly,
    };

    return orientation === 'bottom' ? (
      <ChannelLayout
        {...composableProps(props, { classNames: 'flex flex-col h-full min-h-0' })}
        id={id}
        ref={forwardedRef}
        state={renderState}
      />
    ) : (
      <ThreadLayout
        {...composableProps(props, { classNames: 'dx-container grid-rows-[1fr_min-content_min-content]' })}
        id={id}
        current={current}
        ref={forwardedRef}
        state={renderState}
      />
    );
  },
);

//
// Internal layout helpers — share state via the ChatRenderState bag.
//

type ChatRenderState = {
  messages: Message.Message[];
  members: SpaceMember[];
  activity?: boolean;
  extensions: Extension[];
  autoFocus?: boolean;
  handleSend: () => boolean;
  textboxMetadata: MessageMetadata;
  scrollRef: RefObject<HTMLDivElement | null>;
  sentinelRef: RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
};

type LayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  id: string;
  state: ChatRenderState;
};

/** Thread layout — composer follows messages at intrinsic height. */
const ThreadLayout = React.forwardRef<HTMLDivElement, LayoutProps & Pick<ThreadRootProps, 'current'>>(
  ({ id, current, state, ...props }, ref) => {
    const { t } = useTranslation(meta.id);
    const { messages, members, activity, extensions, autoFocus, handleSend, textboxMetadata, sentinelRef, readOnly } =
      state;
    return (
      <ThreadComponent.Root {...props} id={id} current={current} ref={ref}>
        <ScrollArea.Root classNames='col-span-2' orientation='vertical'>
          <ScrollArea.Viewport ref={sentinelRef}>
            <div className={mx(threadLayout, 'place-self-end')}>
              {messages.map((message) => (
                <MessagePanel key={message.id} message={message} members={members} />
              ))}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
        {!readOnly && (
          <>
            <MessageTextbox extensions={extensions} autoFocus={autoFocus} onSend={handleSend} {...textboxMetadata} />
            <ThreadComponent.Status activity={activity}>{t('activity.message')}</ThreadComponent.Status>
          </>
        )}
      </ThreadComponent.Root>
    );
  },
);

/** Channel layout — composer pinned to the bottom, messages scroll above it. */
const ChannelLayout = React.forwardRef<HTMLDivElement, LayoutProps>(({ id, state, ...props }, ref) => {
  const { t } = useTranslation(meta.id);
  const {
    messages,
    members,
    activity,
    extensions,
    autoFocus,
    handleSend,
    textboxMetadata,
    scrollRef,
    sentinelRef,
    readOnly,
  } = state;
  return (
    <div {...props} id={id} ref={ref}>
      <div ref={scrollRef} className='flex-1 min-h-0 overflow-y-auto'>
        {messages.map((message) => (
          <div key={message.id} className='grid grid-cols-[var(--dx-rail-size)_1fr] w-full'>
            <MessagePanel message={message} members={members} />
          </div>
        ))}
        <div ref={sentinelRef} />
      </div>
      {!readOnly && (
        <>
          <div className='shrink-0 grid grid-cols-[var(--dx-rail-size)_1fr]'>
            <MessageTextbox extensions={extensions} autoFocus={autoFocus} onSend={handleSend} {...textboxMetadata} />
          </div>
          <div className='shrink-0 px-2 pb-1 text-xs text-description'>{activity ? t('activity.message') : null}</div>
        </>
      )}
    </div>
  );
});
