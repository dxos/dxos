//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Obj, Relation } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { getSpace, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { IconButton, Tag, Tooltip, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  MessageTextbox,
  type MessageTextboxProps,
  Thread as ThreadComponent,
  type ThreadRootProps,
} from '@dxos/react-ui-thread';
import { type AnchoredTo, type Thread } from '@dxos/types';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

import { useStatus } from '#hooks';
import { meta } from '#meta';

import { command } from '../../extensions/command';
import { getMessageMetadata } from '../../util';
import { MessagePanel, buttonClassNames, buttonGroupClassNames } from '../MessagePanel';

export type CommentsThreadProps = {
  anchor: AnchoredTo.AnchoredTo;
  onAttend?: (anchor: AnchoredTo.AnchoredTo) => void;
  onComment?: (anchor: AnchoredTo.AnchoredTo, message: string) => void;
  onResolve?: (anchor: AnchoredTo.AnchoredTo) => void;
  onMessageDelete?: (anchor: AnchoredTo.AnchoredTo, messageId: string) => void;
  onThreadDelete?: (anchor: AnchoredTo.AnchoredTo) => void;
  onAcceptProposal?: (anchor: AnchoredTo.AnchoredTo, messageId: string) => void;
} & Pick<ThreadRootProps, 'current'>;

export const CommentsThread = ({
  anchor,
  current,
  onAttend,
  onComment,
  onResolve,
  onMessageDelete,
  onThreadDelete,
  onAcceptProposal,
}: CommentsThreadProps) => {
  const { themeMode } = useThemeContext();
  const { t } = useTranslation(meta.id);
  const identity = useIdentity()!;
  const space = getSpace(anchor);
  const members = useMembers(space?.id);
  const detached = !anchor.anchor;
  const thread = Relation.getSource(anchor) as Thread.Thread;
  const [messages] = useObject(thread, 'messages');
  const activity = useStatus(space, Obj.getURI(thread));
  const threadScrollRef = useRef<HTMLDivElement | null>(null);

  const textboxMetadata = getMessageMetadata(Obj.getURI(thread), identity);

  // TODO(wittjosiah): This is a hack to reset the editor after a message is sent.
  const [state, setState] = useState({});
  const messageRef = useRef('');
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: t('message.placeholder') }),
      createThemeExtensions({ themeMode }),
      listener({ onChange: ({ text }) => (messageRef.current = text) }),
      command,
    ],
    [state],
  );

  // TODO(thure): Factor out.
  const scrollToEnd = (behavior: ScrollBehavior) =>
    setTimeout(() => threadScrollRef.current?.scrollIntoView({ behavior, block: 'end' }), 10);

  const handleAttend = useCallback(() => onAttend?.(anchor), [onAttend, anchor]);
  const handleResolve = useCallback(() => onResolve?.(anchor), [onResolve, anchor]);
  const handleMessageDelete = useCallback((id: string) => onMessageDelete?.(anchor, id), [onMessageDelete, anchor]);
  const handleThreadDelete = useCallback(() => onThreadDelete?.(anchor), [onThreadDelete, anchor]);
  const handleAcceptProposal = useCallback((id: string) => onAcceptProposal?.(anchor, id), [onAcceptProposal, anchor]);

  const handleComment = useCallback<NonNullable<MessageTextboxProps['onSend']>>(() => {
    if (!messageRef.current) {
      return false;
    }

    onComment?.(anchor, messageRef.current);
    messageRef.current = '';
    scrollToEnd('instant');
    setState({});

    return true;
  }, [anchor, identity]);

  return (
    <ThreadComponent.Root
      id={Obj.getURI(thread)}
      classNames='pt-2 border-b border-subdued-separator last:border-none'
      current={current}
      onClickCapture={handleAttend}
      onFocusCapture={handleAttend}
    >
      <div
        className={mx(
          'col-span-2 grid grid-cols-[var(--dx-rail-size)_1fr_min-content]',
          hoverableControls,
          hoverableFocusedWithinControls,
        )}
      >
        {detached ? (
          <Tooltip.Trigger asChild content={t('detached-thread.label')} side='top'>
            <ThreadComponent.Header detached>{thread.name}</ThreadComponent.Header>
          </Tooltip.Trigger>
        ) : (
          <ThreadComponent.Header>{thread.name}</ThreadComponent.Header>
        )}
        <div className={buttonGroupClassNames}>
          {thread.status === 'staged' && <Tag palette='neutral'>{t('draft.button')}</Tag>}
          {onResolve && !(thread?.status === 'staged') && (
            <IconButton
              data-testid='thread.resolve'
              variant='ghost'
              icon={thread?.status === 'resolved' ? 'ph--check--fill' : 'ph--check--regular'}
              iconOnly
              label={t('resolve-thread.label')}
              classNames={[buttonClassNames, thread?.status !== 'resolved' && hoverableControlItem]}
              onClick={handleResolve}
            />
          )}
          {onThreadDelete && (
            <IconButton
              data-testid='thread.delete'
              variant='ghost'
              icon='ph--x--regular'
              iconOnly
              label={t('delete-thread.label')}
              classNames={[buttonClassNames, hoverableControlItem]}
              onClick={handleThreadDelete}
            />
          )}
        </div>
      </div>

      {messages?.map((ref) => (
        <MessagePanel
          key={ref.uri}
          editable
          message={ref}
          members={members}
          onDelete={handleMessageDelete}
          onAcceptProposal={handleAcceptProposal}
        />
      ))}

      {/*
        Autofocus only newly-created (draft) threads. Once the first message is
        posted the thread transitions from 'staged' → 'active' and stops stealing
        focus, satisfying the "one scenario only" constraint flagged in the
        previous TODO (multiple active threads no longer fight for focus).
      */}
      <MessageTextbox
        autoFocus={thread.status === 'staged'}
        extensions={extensions}
        onSend={handleComment}
        {...textboxMetadata}
      />

      <ThreadComponent.Status activity={activity}>{t('activity.message')}</ThreadComponent.Status>

      <div className='h-px -mt-px' ref={threadScrollRef} />
    </ThreadComponent.Root>
  );
};
