//
// Copyright 2026 DXOS.org
//

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { type SpaceMember } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { ScrollArea, type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import { MessageTextbox, Thread as ThreadComponent, type ThreadRootProps, threadLayout } from '@dxos/react-ui-thread';
import { type Message } from '@dxos/types';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';
import { composable, composableProps, mx } from '@dxos/ui-theme';
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
  } & Pick<ThreadRootProps, 'current'>
>;

/**
 * Pure chat UI: scrollable message list + composer textbox + activity indicator.
 * Owns its own UI state (textbox content, scroll position, editor extensions) but
 * does not load data or invoke operations — the caller passes messages and an
 * `onSend` callback. Used by both `ThreadContainer` (AutoMerge `Thread`) and
 * `ChannelContainer`'s feed-backed channel chat.
 */
export const Chat = composable<HTMLDivElement, ChatProps>(
  ({ id, identity, members, messages, activity, onSend, autoFocusTextbox, current, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();
    const [autoFocus, setAutoFocus] = useState(autoFocusTextbox);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    // Force the editor to remount after a successful send so its content resets.
    const [_count, _setCount] = useState(0);
    const rerenderEditor = () => _setCount((count) => count + 1);

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
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior, block: 'end' }), 10);

    useLayoutEffect(() => {
      scrollToEnd('instant');
    }, []);

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
      rerenderEditor();
      return true;
    };

    return (
      <ThreadComponent.Root
        {...composableProps(props, {
          classNames: 'dx-container grid-rows-[1fr_min-content_min-content]',
        })}
        id={id}
        current={current}
        ref={forwardedRef}
      >
        <ScrollArea.Root classNames='col-span-2' orientation='vertical'>
          <ScrollArea.Viewport ref={scrollRef}>
            <div role='none' className={mx(threadLayout, 'place-self-end')}>
              {messages.filter(isNonNullable).map((message) => (
                <MessagePanel key={message.id} message={message} members={members} />
              ))}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>

        <MessageTextbox extensions={extensions} autoFocus={autoFocus} onSend={handleSend} {...textboxMetadata} />
        <ThreadComponent.Status activity={activity}>{t('activity.message')}</ThreadComponent.Status>
      </ThreadComponent.Root>
    );
  },
);
