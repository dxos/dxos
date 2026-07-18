//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Obj, Relation } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { getSpace } from '@dxos/react-client/echo';
import { IconButton, Tag, Tooltip, useTranslation } from '@dxos/react-ui';
import { Message as MessageComponent, Thread, type ThreadComponents } from '@dxos/react-ui-thread';
import { type AnchoredTo, type Message, Thread as ThreadType } from '@dxos/types';
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
  /** Apply the change this (branch-review) thread is anchored to and resolve it; shown while diffing. */
  onAcceptChange?: (anchor: AnchoredTo.AnchoredTo) => void;
};

// TODO(wittjosiah): Factor out to @dxos/echo-react as a reactive hook that subscribes to
// relation changes. The try/catch should not be necessary — Relation.getSource should
// return undefined rather than throw when the source is transiently unavailable.
const useRelationSource = <T extends Relation.Unknown>(relation: T): Relation.SourceOf<T> | undefined => {
  try {
    return Relation.getSource(relation);
  } catch {
    return undefined;
  }
};

/**
 * A single anchored comment thread, rendered on the `@dxos/react-ui-thread`
 * primitives (`Thread.*` / `Message.Tile`).
 */
export const CommentThread = ({
  anchor,
  components,
  current,
  onAttend,
  onComment,
  onResolve,
  onMessageDelete,
  onThreadDelete,
  onAcceptProposal,
  onAcceptChange,
}: CommentThreadProps) => {
  const { t } = useTranslation(meta.profile.key);
  const identity = useIdentity();
  const space = getSpace(anchor);
  const members = useMembers(space?.id);
  const detached = !anchor.anchor;
  const source = useRelationSource(anchor);
  const thread = source && Obj.instanceOf(ThreadType.Thread, source) ? source : undefined;
  const threadUri = thread ? Obj.getURI(thread) : undefined;
  const [messages] = useObject(thread, 'messages');
  // Subscribe to `status` so resolving/unresolving the thread re-renders its controls and the
  // accept-change affordance (the `messages` subscription alone does not observe status changes).
  const [status] = useObject(thread, 'status');
  const activity = useStatus(space, threadUri);

  const getMetadata = useCallback(
    (message: Message.Message) => {
      const senderIdentity = members.find(
        (member) =>
          (message.sender.identityDid && member.did === message.sender.identityDid) ||
          (message.sender.identityKey && member.identityKey === message.sender.identityKey),
      );
      return getMessageMetadata(Obj.getURI(message), senderIdentity, message.sender);
    },
    [members],
  );
  const textboxMetadata = useMemo(
    () => getMessageMetadata(threadUri ?? '', identity ?? undefined),
    [threadUri, identity],
  );
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
  const handleAcceptChange = useCallback(() => onAcceptChange?.(anchor), [onAcceptChange, anchor]);
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

  if (!thread || !threadUri) {
    return null;
  }

  const headerControls = (
    <div className='flex flex-row items-center gap-0.5 pe-2'>
      {status === 'staged' && <Tag hue='neutral'>{t('draft.button')}</Tag>}
      {onAcceptChange && !detached && status !== 'resolved' && (
        <IconButton
          data-testid='thread.accept-change'
          variant='ghost'
          icon='ph--check-circle--regular'
          iconOnly
          label={t('accept-change.label')}
          classNames={['p-1! transition-opacity', hoverableControlItem]}
          onClick={handleAcceptChange}
        />
      )}
      {onResolve && !(status === 'staged') && (
        <IconButton
          data-testid='thread.resolve'
          variant='ghost'
          icon={status === 'resolved' ? 'ph--check--fill' : 'ph--check--regular'}
          iconOnly
          label={t('resolve-thread.label')}
          classNames={['p-1! transition-opacity', status !== 'resolved' && hoverableControlItem]}
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
          autoFocus={status === 'staged'}
          onSend={handleComment}
        />

        <Thread.Status activity={activity}>{t('activity.message')}</Thread.Status>
      </Thread.Content>
    </Thread.Root>
  );
};
