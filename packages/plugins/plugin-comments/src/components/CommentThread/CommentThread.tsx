//
// Copyright 2024 DXOS.org
//

import React, { type ReactElement, useCallback, useMemo } from 'react';

import { Obj, Relation } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { getSpace, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { IconButton, Tag, Tooltip, useTranslation } from '@dxos/react-ui';
import { Message as MessageComponent, type ThreadComponents, Thread } from '@dxos/react-ui-thread';
import { type AnchoredTo, type Message, type Thread as ThreadType } from '@dxos/types';
import { hoverableControlItem } from '@dxos/ui-theme';

import { useStatus } from '#hooks';
import { meta } from '#meta';

import { getMessageMetadata } from '../../util';

export type CommentThreadProps = {
  anchor: AnchoredTo.AnchoredTo;
  /** Injected renderers (e.g. the Surface-backed object tile) supplied by the container. */
  components: ThreadComponents;
  current?: boolean;
  onAttend?: (anchor: AnchoredTo.AnchoredTo) => void;
  onComment?: (anchor: AnchoredTo.AnchoredTo, message: string) => void;
  onResolve?: (anchor: AnchoredTo.AnchoredTo) => void;
  onMessageDelete?: (anchor: AnchoredTo.AnchoredTo, messageId: string) => void;
  onThreadDelete?: (anchor: AnchoredTo.AnchoredTo) => void;
  onAcceptProposal?: (anchor: AnchoredTo.AnchoredTo, messageId: string) => void;
};

type CommentThreadImplProps = CommentThreadProps & { thread: ThreadType.Thread };

/**
 * A single anchored comment thread, rendered on the `@dxos/react-ui-thread`
 * primitives (`Thread.*` / `Message.Tile`).
 *
 * Wraps `CommentThreadImpl` with a guard that returns null while the anchor's
 * source thread is transiently unavailable — e.g. when a batched delete causes
 * proxy signals to fire before React has a chance to update the query results.
 */
export const CommentThread = (props: CommentThreadProps): ReactElement | null => {
  let thread: ThreadType.Thread;
  try {
    thread = Relation.getSource(props.anchor) as ThreadType.Thread;
  } catch {
    return null;
  }
  return <CommentThreadImpl {...props} thread={thread} />;
};

const CommentThreadImpl = ({
  anchor,
  thread,
  components,
  current,
  onAttend,
  onComment,
  onResolve,
  onMessageDelete,
  onThreadDelete,
  onAcceptProposal,
}: CommentThreadImplProps) => {
  const { t } = useTranslation(meta.id);
  const identity = useIdentity();
  const space = getSpace(anchor);
  const members = useMembers(space?.key);
  const detached = !anchor.anchor;
  const threadUri = Obj.getURI(thread);
  const [messages] = useObject(thread, 'messages');
  const activity = useStatus(space, threadUri);

  const getMetadata = useCallback(
    (message: Message.Message) => {
      const senderIdentity = members.find(
        (member) =>
          (message.sender.identityDid && member.identity.did === message.sender.identityDid) ||
          (message.sender.identityKey && member.identity.identityKey.toHex() === message.sender.identityKey),
      );
      return getMessageMetadata(Obj.getURI(message), senderIdentity?.identity, message.sender);
    },
    [members],
  );
  const textboxMetadata = useMemo(() => getMessageMetadata(threadUri, identity ?? undefined), [threadUri, identity]);
  const loadedMessages = useMemo(
    () => (messages ?? []).map((ref) => ref.target).filter((message): message is Message.Message => !!message),
    [messages],
  );

  const handleAttend = useCallback(() => onAttend?.(anchor), [onAttend, anchor]);
  const handleResolve = useCallback(() => onResolve?.(anchor), [onResolve, anchor]);
  const handleMessageDelete = useCallback(
    (messageId: string) => onMessageDelete?.(anchor, messageId),
    [onMessageDelete, anchor],
  );
  const handleThreadDelete = useCallback(() => onThreadDelete?.(anchor), [onThreadDelete, anchor]);
  const handleAcceptProposal = useCallback(
    (messageId: string) => onAcceptProposal?.(anchor, messageId),
    [onAcceptProposal, anchor],
  );

  const handleComment = useCallback(
    (text: string): boolean => {
      // Reject (don't clear the composer) when there's no text or no handler.
      if (!onComment || !text) {
        return false;
      }
      onComment(anchor, text);
      return true;
    },
    [anchor, onComment],
  );

  const headerControls = (
    <div className='flex flex-row items-center gap-0.5 pe-2'>
      {thread.status === 'staged' && <Tag palette='neutral'>{t('draft.button')}</Tag>}
      {onResolve && !(thread.status === 'staged') && (
        <IconButton
          data-testid='thread.resolve'
          variant='ghost'
          icon={thread.status === 'resolved' ? 'ph--check--fill' : 'ph--check--regular'}
          iconOnly
          label={t('resolve-thread.label')}
          classNames={['p-1! transition-opacity', thread.status !== 'resolved' && hoverableControlItem]}
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
          classNames={['p-1! transition-opacity', hoverableControlItem]}
          onClick={handleThreadDelete}
        />
      )}
    </div>
  );

  const header = detached ? (
    <Tooltip.Trigger asChild content={t('detached-thread.label')} side='top'>
      <Thread.Header detached current={current} title={thread.name} onSelect={handleAttend} controls={headerControls} />
    </Tooltip.Trigger>
  ) : (
    <Thread.Header current={current} title={thread.name} onSelect={handleAttend} controls={headerControls} />
  );

  return (
    <Thread.Root
      getMetadata={getMetadata}
      components={components}
      identityDid={identity?.did}
      editable
      onMessageDelete={onMessageDelete ? handleMessageDelete : undefined}
      onAcceptProposal={onAcceptProposal ? handleAcceptProposal : undefined}
    >
      <Thread.Content
        id={threadUri}
        classNames='pt-2 border-b border-subdued-separator last:border-none'
        current={current}
        onClickCapture={handleAttend}
        onFocusCapture={handleAttend}
      >
        {header}

        {/*
          Comment threads have few messages and live inside the companion's outer
          scroll area, so render tiles inline (not the virtual stack) — this keeps
          them at full width so their controls align with the header's controls.
        */}
        {loadedMessages.map((message) => (
          <MessageComponent.Tile key={Obj.getURI(message)} message={message} />
        ))}

        {/*
          Autofocus only newly-created (draft) threads. Once the first message is
          posted the thread transitions from 'staged' → 'active' and stops stealing
          focus, so multiple active threads no longer fight for focus.
        */}
        <Thread.Textbox
          {...textboxMetadata}
          placeholder={t('message.placeholder')}
          autoFocus={thread.status === 'staged'}
          onSend={handleComment}
        />

        <Thread.Status activity={activity}>{t('activity.message')}</Thread.Status>
      </Thread.Content>
    </Thread.Root>
  );
};
