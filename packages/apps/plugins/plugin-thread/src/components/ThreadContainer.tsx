//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { type Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { TextObject } from '@dxos/react-client/echo';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { useTextModel } from '@dxos/react-ui-editor';
import {
  MessageTextbox,
  type MessageTextboxProps,
  Thread,
  ThreadFooter,
  ThreadHeading,
  type ThreadProps,
} from '@dxos/react-ui-thread';

import { MessageContainer } from './MessageContainer';
import { useStatus, useMessageMetadata } from '../hooks';
import { THREAD_PLUGIN } from '../meta';

export type ThreadContainerProps = {
  space: Space;
  thread: ThreadType;
  currentRelatedId?: string;
  onAttend?: () => void;
  autoFocusTextBox?: boolean;
} & Pick<ThreadProps, 'current'>;

export const ThreadContainer = ({
  space,
  thread,
  currentRelatedId,
  current,
  autoFocusTextBox,
  onAttend,
}: ThreadContainerProps) => {
  const identity = useIdentity()!;
  const members = useMembers(space.key);
  const activity = useStatus(space, thread.id);
  const { t } = useTranslation(THREAD_PLUGIN);

  const [nextMessage, setNextMessage] = useState({ text: new TextObject() });
  const nextMessageModel = useTextModel({ text: nextMessage.text, identity, space });

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
      // TODO(thure): Delete thread if no messages remain.
    }
  };

  const textboxMetadata = useMessageMetadata(thread.id, identity);

  return (
    <Thread onClickCapture={onAttend} onFocusCapture={onAttend} current={current}>
      {thread.title && <ThreadHeading>{thread.title}</ThreadHeading>}
      {thread.messages.map((message) => (
        <MessageContainer key={message.id} message={message} members={members} onDelete={handleDelete} />
      ))}
      {nextMessageModel && (
        <>
          <MessageTextbox
            onSend={handleCreate}
            autoFocus={autoFocusTextBox}
            placeholder={t('message placeholder')}
            {...textboxMetadata}
            model={nextMessageModel}
          />
          <ThreadFooter activity={activity}>{t('activity message')}</ThreadFooter>
        </>
      )}
    </Thread>
  );
};
