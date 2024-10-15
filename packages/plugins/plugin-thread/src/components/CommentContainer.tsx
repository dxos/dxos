//
// Copyright 2023 DXOS.org
//

import { CheckCircle, X } from '@phosphor-icons/react';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { create } from '@dxos/echo-schema';
import { MessageType } from '@dxos/plugin-space/types';
import { fullyQualifiedId, getSpace, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, Tag, Tooltip, useThemeContext, useTranslation } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/react-ui-editor';
import {
  getSize,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/react-ui-theme';
import { MessageTextbox, type MessageTextboxProps, Thread, ThreadFooter, ThreadHeading } from '@dxos/react-ui-thread';
import { nonNullable } from '@dxos/util';

import { MessageContainer } from './MessageContainer';
import { command } from './command-extension';
import { type ThreadContainerProps } from './types';
import { useStatus } from '../hooks';
import { THREAD_PLUGIN } from '../meta';
import { getMessageMetadata } from '../util';

const sizeClass = getSize(4);

const ToggleResolvedButton = ({
  isResolved,
  onResolve,
}: {
  isResolved: boolean | undefined;
  onResolve: () => void;
}) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  const label = t(isResolved ? 'mark as unresolved label' : 'mark as resolved label');
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button
          variant='ghost'
          data-testid='thread.toggle-resolved'
          onClick={onResolve}
          classNames={['min-bs-0 p-1', !isResolved && hoverableControlItem]}
        >
          <span className='sr-only'>{label}</span>
          {isResolved ? <CheckCircle className={sizeClass} weight='fill' /> : <CheckCircle className={sizeClass} />}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content classNames={'z-[21]'}>
          {label}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

const DeleteThreadButton = ({ onDelete }: { onDelete: () => void }) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  const label = t('delete thread label');
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button
          variant='ghost'
          data-testid='thread.delete'
          onClick={onDelete}
          classNames={['min-bs-0 p-1', hoverableControlItem]}
        >
          <span className='sr-only'>{label}</span>
          <X className={sizeClass} />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content classNames='z-[21]'>
          {label}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

export const CommentContainer = ({
  thread,
  detached,
  context,
  current,
  onAttend,
  onThreadDelete,
  onMessageDelete,
  onResolve,
  onComment,
}: ThreadContainerProps) => {
  const identity = useIdentity()!;
  const space = getSpace(thread);
  const members = useMembers(space?.key);
  const activity = useStatus(space, fullyQualifiedId(thread));
  const { t } = useTranslation(THREAD_PLUGIN);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const { themeMode } = useThemeContext();

  const textboxMetadata = getMessageMetadata(fullyQualifiedId(thread), identity);
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

  // TODO(thure): Factor out.
  const scrollToEnd = (behavior: ScrollBehavior) =>
    setTimeout(() => threadScrollRef.current?.scrollIntoView({ behavior, block: 'end' }), 10);

  const handleCreate: MessageTextboxProps['onSend'] = useCallback(() => {
    if (!messageRef.current) {
      return false;
    }

    thread.messages.push(
      create(MessageType, {
        sender: { identityKey: identity.identityKey.toHex() },
        timestamp: new Date().toISOString(),
        text: messageRef.current,
        context,
      }),
    );
    onComment?.(thread);

    messageRef.current = '';
    scrollToEnd('instant');
    rerenderEditor();

    // TODO(burdon): Scroll to bottom.
    return true;
  }, [thread, identity]);

  return (
    <Thread onClickCapture={onAttend} onFocusCapture={onAttend} current={current} id={fullyQualifiedId(thread)}>
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
              <ThreadHeading detached>{thread.name ?? t('thread title placeholder')}</ThreadHeading>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content classNames='z-[21]' side='top'>
                {t('detached thread label')}
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        ) : (
          <ThreadHeading>{thread.name ?? t('thread title placeholder')}</ThreadHeading>
        )}
        <div className='flex flex-row items-center pli-1'>
          {thread.status === 'staged' && <Tag palette='neutral'>{t('draft button')}</Tag>}
          {onResolve && !(thread?.status === 'staged') && (
            <ToggleResolvedButton isResolved={thread?.status === 'resolved'} onResolve={onResolve} />
          )}
          {onThreadDelete && <DeleteThreadButton onDelete={onThreadDelete} />}
        </div>
      </div>
      {thread.messages.filter(nonNullable).map((message) => (
        <MessageContainer
          key={message.id}
          message={message}
          members={members}
          onDelete={(id: string) => onMessageDelete?.(id)}
        />
      ))}
      {/*
        TODO(wittjosiah): Can't autofocus this generally.
          There can be multiple threads with inputs and they can't all be focused.
          Also, it steals focus from documents when first rendered.
          Need to find a way to autofocus in one scenario only: when a new thread is created.
      */}
      <MessageTextbox extensions={extensions} onSend={handleCreate} {...textboxMetadata} />
      <ThreadFooter activity={activity}>{t('activity message')}</ThreadFooter>
      {/* NOTE(thure): This can’t also be the `overflow-anchor` because `ScrollArea` injects an interceding node that contains this necessary ref’d element. */}
      <div role='none' className='bs-px -mbs-px' ref={threadScrollRef} />
    </Thread>
  );
};
