//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { useRef, useState } from 'react';

import { Message as MessageType } from '@braneframe/types';
import { TextObject, getTextContent, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { AnchoredOverflow, Button, Tooltip, useTranslation } from '@dxos/react-ui';
import { useTextModel } from '@dxos/react-ui-editor';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';
import { MessageTextbox, type MessageTextboxProps, Thread, ThreadFooter, ThreadHeading } from '@dxos/react-ui-thread';

import { MessageContainer } from './MessageContainer';
import { command } from './command-extension';
import { type ThreadContainerProps } from './types';
import { useStatus, useMessageMetadata } from '../hooks';
import { THREAD_PLUGIN } from '../meta';

export const CommentContainer = ({
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
    const content = nextMessage.text;
    if (!getTextContent(content)) {
      return false;
    }

    const block = {
      timestamp: new Date().toISOString(),
      content,
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
