//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Relation } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Card, IconButton, Tag, Tooltip, useTranslation } from '@dxos/react-ui';
import { Message as MessageComponent, Thread, type ObjectTileComponent } from '@dxos/react-ui-thread';
import { type AnchoredTo, type Message, type Thread as ThreadType } from '@dxos/types';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

import { useStatus } from '#hooks';
import { meta } from '#meta';

import { getMessageMetadata } from '../../util';

const buttonGroupClassNames = 'flex flex-row items-center gap-0.5 pe-2';
const buttonClassNames = 'p-1! transition-opacity';

/**
 * Object/reference message-block tile, injected into `Thread.Root` so that
 * `@dxos/react-ui-thread` stays free of `@dxos/app-framework`. Renders the
 * referenced subject via an app-framework `Surface` (the card role).
 */
const stringField = (subject: Obj.Unknown, key: string): string | undefined => {
  // `subject` is an untyped ECHO object (Obj.Unknown); index into it for a best-effort title label.
  const value = (subject as unknown as Record<string, unknown>)[key];
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'content' in value && typeof value.content === 'string') {
    return value.content;
  }
  return undefined;
};

const ObjectTile: ObjectTileComponent = ({ subject }) => {
  // TODO(burdon): Use annotation to get title.
  const title = useMemo(
    () => stringField(subject, 'name') ?? stringField(subject, 'title') ?? stringField(subject, 'type') ?? 'Object',
    [subject],
  );

  const Fallback = useCallback(() => <span className='p-1 text-sm text-description'>{title}</span>, [title]);

  return (
    <Card.Root className={mx('grid col-span-3 py-1 pr-4', hoverableControls, hoverableFocusedWithinControls)}>
      <Surface.Surface
        type={AppSurface.Card}
        limit={1}
        data={{ subject } satisfies AppSurface.ObjectCardData}
        fallback={Fallback}
      />
    </Card.Root>
  );
};

export type CommentThreadProps = {
  anchor: AnchoredTo.AnchoredTo;
  current?: boolean;
  onAttend?: (anchor: AnchoredTo.AnchoredTo) => void;
  onComment?: (anchor: AnchoredTo.AnchoredTo, message: string) => void;
  onResolve?: (anchor: AnchoredTo.AnchoredTo) => void;
  onMessageDelete?: (anchor: AnchoredTo.AnchoredTo, messageId: string) => void;
  onThreadDelete?: (anchor: AnchoredTo.AnchoredTo) => void;
  onAcceptProposal?: (anchor: AnchoredTo.AnchoredTo, messageId: string) => void;
};

/**
 * A single anchored comment thread, rendered on the `@dxos/react-ui-thread`
 * primitives (`Thread.*` / `Message.Tile`).
 */
export const CommentThread = ({
  anchor,
  current,
  onAttend,
  onComment,
  onResolve,
  onMessageDelete,
  onThreadDelete,
  onAcceptProposal,
}: CommentThreadProps) => {
  const { t } = useTranslation(meta.id);
  const identity = useIdentity();
  const space = getSpace(anchor);
  const detached = !anchor.anchor;
  const thread = Relation.getSource(anchor) as ThreadType.Thread;
  const threadUri = Obj.getURI(thread);
  const [messages] = useObject(thread, 'messages');
  const activity = useStatus(space, threadUri);

  const components = useMemo(() => ({ Object: ObjectTile }), []);
  const getMetadata = useCallback((message: Message.Message) => getMessageMetadata(Obj.getURI(message)), []);
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
    <div className={buttonGroupClassNames}>
      {thread.status === 'staged' && <Tag palette='neutral'>{t('draft.button')}</Tag>}
      {onResolve && !(thread.status === 'staged') && (
        <IconButton
          data-testid='thread.resolve'
          variant='ghost'
          icon={thread.status === 'resolved' ? 'ph--check--fill' : 'ph--check--regular'}
          iconOnly
          label={t('resolve-thread.label')}
          classNames={[buttonClassNames, thread.status !== 'resolved' && hoverableControlItem]}
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
  );

  const header = detached ? (
    <Tooltip.Trigger asChild content={t('detached-thread.label')} side='top'>
      <Thread.Header detached title={thread.name} onSelect={handleAttend} controls={headerControls} />
    </Tooltip.Trigger>
  ) : (
    <Thread.Header title={thread.name} onSelect={handleAttend} controls={headerControls} />
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
