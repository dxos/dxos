//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Ref, Relation } from '@dxos/echo';
import { fullyQualifiedId, getSpace, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { IconButton, Tag, Tooltip, useThemeContext, useTranslation } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/react-ui-editor';
import { hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';
import { MessageTextbox, type MessageTextboxProps, Thread, type ThreadRootProps } from '@dxos/react-ui-thread';
import { type AnchoredTo } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { MessageContainer } from './MessageContainer';
import { command } from './command-extension';
import { useStatus } from '../hooks';
import { meta } from '../meta';
import { type ThreadType } from '../types';
import { getMessageMetadata } from '../util';

export type CommentsThreadContainerProps = {
  anchor: AnchoredTo;
  onAttend?: (anchor: AnchoredTo) => void;
  onComment?: (anchor: AnchoredTo, message: string) => void;
  onResolve?: (anchor: AnchoredTo) => void;
  onMessageDelete?: (anchor: AnchoredTo, messageId: string) => void;
  onThreadDelete?: (anchor: AnchoredTo) => void;
} & Pick<ThreadRootProps, 'current'>;

export const CommentsThreadContainer = ({
  anchor,
  current,
  onAttend,
  onComment,
  onResolve,
  onMessageDelete,
  onThreadDelete,
}: CommentsThreadContainerProps) => {
  const { t } = useTranslation(meta.id);
  const identity = useIdentity()!;
  const space = getSpace(anchor);
  const members = useMembers(space?.key);
  const detached = !anchor.anchor;
  const thread = Relation.getSource(anchor) as ThreadType;
  const activity = useStatus(space, fullyQualifiedId(thread));
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

  const handleAttend = useCallback(() => onAttend?.(anchor), [onAttend, anchor]);
  const handleResolve = useCallback(() => onResolve?.(anchor), [onResolve, anchor]);
  const handleMessageDelete = useCallback((id: string) => onMessageDelete?.(anchor, id), [onMessageDelete, anchor]);
  const handleThreadDelete = useCallback(() => onThreadDelete?.(anchor), [onThreadDelete, anchor]);

  const handleComment: MessageTextboxProps['onSend'] = useCallback(() => {
    if (!messageRef.current) {
      return false;
    }

    onComment?.(anchor, messageRef.current);
    messageRef.current = '';
    scrollToEnd('instant');
    rerenderEditor();

    return true;
  }, [anchor, identity]);

  return (
    <Thread.Root
      id={fullyQualifiedId(thread)}
      classNames='pbs-2'
      current={current}
      onClickCapture={handleAttend}
      onFocusCapture={handleAttend}
    >
      <div
        role='none'
        className={mx(
          'col-span-2 grid grid-cols-[var(--rail-size)_1fr_min-content]',
          hoverableControls,
          hoverableFocusedWithinControls,
        )}
      >
        {detached ? (
          <Tooltip.Trigger asChild content={t('detached thread label')} side='top'>
            <Thread.Header detached>{thread.name}</Thread.Header>
          </Tooltip.Trigger>
        ) : (
          <Thread.Header>{thread.name}</Thread.Header>
        )}
        <div className='flex flex-row items-center pli-1'>
          {thread.status === 'staged' && <Tag palette='neutral'>{t('draft button')}</Tag>}
          {onResolve && thread?.status !== 'staged' && (
            <IconButton
              data-testid='thread.resolve'
              variant='ghost'
              icon={thread?.status === 'resolved' ? 'ph--check--fill' : 'ph--check--regular'}
              iconOnly
              label={t('resolve thread label')}
              classNames='!p-1'
              onClick={handleResolve}
            />
          )}
          {onThreadDelete && (
            <IconButton
              data-testid='thread.delete'
              variant='ghost'
              icon='ph--x--regular'
              iconOnly
              label={t('delete thread label')}
              classNames='!p-1'
              onClick={handleThreadDelete}
            />
          )}
        </div>
      </div>

      {/** TODO(dmaretskyi): How's `thread.messages` undefined? */}
      {Ref.Array.targets(thread.messages?.filter(isNonNullable) ?? []).map((message) => (
        <MessageContainer
          key={message.id}
          editable
          message={message}
          members={members}
          onDelete={handleMessageDelete}
        />
      ))}
      {/*
        TODO(wittjosiah): Can't autofocus this generally.
          There can be multiple threads with inputs and they can't all be focused.
          Also, it steals focus from documents when first rendered.
          Need to find a way to autofocus in one scenario only: when a new thread is created.
      */}
      <MessageTextbox extensions={extensions} onSend={handleComment} {...textboxMetadata} />

      <Thread.Status activity={activity}>{t('activity message')}</Thread.Status>

      {/* NOTE(thure): This can’t also be the `overflow-anchor` because `ScrollArea` injects an interceding node that contains this necessary ref’d element. */}
      <div role='none' className='bs-px -mbs-px' ref={threadScrollRef} />
    </Thread.Root>
  );
};
