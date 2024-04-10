//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MessageType, TextV0Type } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { getSpace, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, Tooltip, useThemeContext, useTranslation } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/react-ui-editor';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';
import { MessageTextbox, type MessageTextboxProps, Thread, ThreadFooter, ThreadHeading } from '@dxos/react-ui-thread';
import { nonNullable } from '@dxos/util';

import { MessageContainer } from './MessageContainer';
import { command } from './command-extension';
import { type ThreadContainerProps } from './types';
import { useStatus } from '../hooks';
import { THREAD_PLUGIN } from '../meta';
import { getMessageMetadata } from '../util';

export const CommentContainer = ({
  thread,
  detached,
  context,
  current,
  autoFocusTextbox,
  onAttend,
  onDelete,
}: ThreadContainerProps) => {
  const identity = useIdentity()!;
  const space = getSpace(thread);
  const members = useMembers(space?.key);
  const activity = useStatus(space, thread.id);
  const { t } = useTranslation(THREAD_PLUGIN);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const [autoFocus, setAutoFocus] = useState(!!autoFocusTextbox);
  const { themeMode } = useThemeContext();

  const textboxMetadata = getMessageMetadata(thread.id, identity);
  // TODO(wittjosiah): This is a hack to reset the editor after a message is sent.
  const [_count, _setCount] = useState(0);
  const rerenderEditor = () => _setCount((count) => count + 1);
  const messageRef = useRef('');
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: t('message placeholder') }),
      createThemeExtensions({ themeMode }),
      listener({ onChange: (text) => (messageRef.current = text) }),
      command,
    ],
    [_count],
  );

  // TODO(thure): Because of the way the `autoFocus` property is handled by TextEditor,
  //  this is the least-bad way of moving focus at the right time, though it is an anti-pattern.
  //  Refactor to behave more like <input/>’s `autoFocus` or `autofocus` (yes, they’re different).
  useEffect(() => {
    setAutoFocus(!!autoFocusTextbox);
  }, [autoFocusTextbox]);

  // TODO(thure): Factor out.
  const scrollToEnd = (behavior: ScrollBehavior) =>
    setTimeout(() => threadScrollRef.current?.scrollIntoView({ behavior, block: 'end' }), 10);

  const handleCreate: MessageTextboxProps['onSend'] = useCallback(() => {
    if (!messageRef.current) {
      return false;
    }

    thread.messages.push(
      E.object(MessageType, {
        from: { identityKey: identity.identityKey.toHex() },
        context,
        blocks: [
          {
            timestamp: new Date().toISOString(),
            content: E.object(TextV0Type, { content: messageRef.current }),
          },
        ],
      }),
    );

    messageRef.current = '';
    setAutoFocus(true);
    scrollToEnd('instant');
    rerenderEditor();

    // TODO(burdon): Scroll to bottom.
    return true;
  }, [thread, identity]);

  const handleDelete = (id: string, index: number) => {
    const messageIndex = thread.messages.filter(nonNullable).findIndex((message) => message.id === id);
    if (messageIndex !== -1) {
      const message = thread.messages[messageIndex];
      message?.blocks.splice(index, 1);
      if (message?.blocks.length === 0) {
        thread.messages.splice(messageIndex, 1);
      }
      if (thread.messages.length === 0) {
        onDelete?.();
      }
    }
  };

  return (
    <Thread onClickCapture={onAttend} onFocusCapture={onAttend} current={current} id={thread.id}>
      <div
        role='none'
        className={mx(
          'col-span-2 grid grid-cols-[var(--rail-size)_1fr_min-content]',
          hoverableControls,
          hoverableFocusedWithinControls,
        )}
      >
        {detached ? (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <ThreadHeading detached>{thread.title ?? t('thread title placeholder')}</ThreadHeading>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content classNames='z-[11]' side='top'>
                {t('detached thread label')}
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        ) : (
          <ThreadHeading>{thread.title ?? t('thread title placeholder')}</ThreadHeading>
        )}
        {onDelete && (
          <Button
            variant='ghost'
            data-testid='thread.delete'
            onClick={onDelete}
            classNames={['min-bs-0 p-1 mie-1', hoverableControlItem]}
          >
            <X />
          </Button>
        )}
      </div>
      {thread.messages.filter(nonNullable).map((message) => (
        <MessageContainer key={message.id} message={message} members={members} onDelete={handleDelete} />
      ))}
      <MessageTextbox extensions={extensions} autoFocus={autoFocus} onSend={handleCreate} {...textboxMetadata} />
      <ThreadFooter activity={activity}>{t('activity message')}</ThreadFooter>
      {/* NOTE(thure): This can’t also be the `overflow-anchor` because `ScrollArea` injects an interceding node that contains this necessary ref’d element. */}
      <div role='none' className='bs-px -mbs-px' ref={threadScrollRef} />
    </Thread>
  );
};
