//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { useRef, useState } from 'react';

import { type Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { TextObject } from '@dxos/react-client/echo';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { AnchoredOverflow, Button, Tooltip, useTranslation } from '@dxos/react-ui';
import { useTextModel } from '@dxos/react-ui-editor';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';
import {
  MessageTextbox,
  type MessageTextboxProps,
  Thread,
  ThreadFooter,
  ThreadHeading,
  type ThreadProps,
} from '@dxos/react-ui-thread';

import { MessageContainer } from './MessageContainer';
import { command } from './command-extension';
import { useStatus, useMessageMetadata } from '../hooks';
import { THREAD_PLUGIN } from '../meta';

export type ThreadContainerProps = {
  space: Space;
  thread: ThreadType;
  currentRelatedId?: string;
  autoFocusTextBox?: boolean;
  detached?: boolean;
  onAttend?: () => void;
  onDelete?: () => void;
} & Pick<ThreadProps, 'current'>;

/**
 * Component for connecting an ECHO Thread object to the UI component Thread.
 * @param space - the containing Space entity
 * @param thread - the Thread entity
 * @param detached - whether this thread is detached from the object
 * @param currentRelatedId - an entity’s id that this thread is related to
 * @param current - whether this thread is current (wrt ARIA) in the app
 * @param autoFocusTextBox - whether to set `autoFocus` on the thread’s textbox
 * @param onAttend - combined callback for `onClickCapture` and `onFocusCapture` within the thread
 * @param onDelete - callback for deleting the thread
 * @constructor
 */
// TODO(wittjosiah): Decide if chat & comment threads are similar enough to share a container.
//  Either way they will be built with the same pure @dxos/react-ui-thread components.
//  Currently this container is used for both, but is focused on comments.
//  Comments-specific things right now are primarily how the header is setup.
export const ThreadContainer = ({
  space,
  thread,
  detached,
  currentRelatedId,
  current,
  autoFocusTextBox,
  onAttend,
  onDelete,
}: ThreadContainerProps) => {
  const identity = useIdentity()!;
  const members = useMembers(space.key);
  const activity = useStatus(space, thread.id);
  const { t } = useTranslation(THREAD_PLUGIN);

  const [nextMessage, setNextMessage] = useState({ text: new TextObject() });
  const nextMessageModel = useTextModel({ text: nextMessage.text, identity, space });
  const autoFocusAfterSend = useRef<boolean>(false);

  // TODO(burdon): Change to model.
  const handleCreate: MessageTextboxProps['onSend'] = () => {
    const block = {
      timestamp: new Date().toISOString(),
      content: nextMessage.text,
    };

    thread.messages.push(
      new MessageType({
        from: { identityKey: identity.identityKey.toHex() },
        context: { object: currentRelatedId },
        blocks: [block],
      }),
    );

    setNextMessage(() => {
      autoFocusAfterSend.current = true;
      return { text: new TextObject() };
    });

    // TODO(burdon): Scroll to bottom.
    return true;
  };

  const handleDelete = (id: string, index: number) => {
    const messageIndex = thread.messages.findIndex((message) => message.id === id);
    if (messageIndex !== -1) {
      const message = thread.messages[messageIndex];
      message.blocks.splice(index, 1);
      if (message.blocks.length === 0) {
        thread.messages.splice(messageIndex, 1);
      }
      if (thread.messages.length === 0) {
        onDelete?.();
      }
    }
  };

  const textboxMetadata = useMessageMetadata(thread.id, identity);

  return (
    <Thread onClickCapture={onAttend} onFocusCapture={onAttend} current={current} id={thread.id}>
      <div
        role='none'
        className={mx(
          'col-span-2 grid grid-cols-[3rem_1fr_min-content]',
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
          <Button variant='ghost' onClick={onDelete} classNames={['min-bs-0 p-1 mie-1', hoverableControlItem]}>
            <X />
          </Button>
        )}
      </div>
      {thread.messages.map((message) => (
        <MessageContainer key={message.id} message={message} members={members} onDelete={handleDelete} />
      ))}
      {nextMessageModel && (
        <>
          <MessageTextbox
            onSend={handleCreate}
            autoFocus={autoFocusAfterSend.current || autoFocusTextBox}
            placeholder={t('message placeholder')}
            {...textboxMetadata}
            model={nextMessageModel}
            extensions={[command]}
          />
          <ThreadFooter activity={activity}>{t('activity message')}</ThreadFooter>
          <AnchoredOverflow.Anchor />
        </>
      )}
    </Thread>
  );
};
