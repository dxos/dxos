//
// Copyright 2023 DXOS.org
//

import React, { useLayoutEffect, useRef, useState } from 'react';

import { Message as MessageType } from '@braneframe/types';
import { TextObject, getTextContent, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ScrollArea, useTranslation } from '@dxos/react-ui';
import { useTextModel } from '@dxos/react-ui-editor';
import { MessageTextbox, type MessageTextboxProps, Thread, ThreadFooter, threadLayout } from '@dxos/react-ui-thread';

import { MessageContainer } from './MessageContainer';
import { command } from './command-extension';
import { type ThreadContainerProps } from './types';
import { useStatus, useMessageMetadata } from '../hooks';
import { THREAD_PLUGIN } from '../meta';

/**
 * Component for connecting an ECHO Thread object to the UI component Thread.
 * @param space - the containing Space entity
 * @param thread - the Thread entity
 * @param currentRelatedId - an entity’s id that this thread is related to
 * @param current - whether this thread is current (wrt ARIA) in the app
 * @param autoFocusTextBox - whether to set `autoFocus` on the thread’s textbox
 * @constructor
 */
export const ChatContainer = ({ space, thread, currentRelatedId, current, autoFocusTextBox }: ThreadContainerProps) => {
  const identity = useIdentity()!;
  const members = useMembers(space.key);
  const activity = useStatus(space, thread.id);
  const { t } = useTranslation(THREAD_PLUGIN);

  const [nextMessage, setNextMessage] = useState({ text: new TextObject() });
  const nextMessageModel = useTextModel({ text: nextMessage.text, identity, space });
  const autoFocusAfterSend = useRef<boolean>(false);
  const textboxMetadata = useMessageMetadata(thread.id, identity);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    // TODO(thure): `flex-col-reverse` does not work to start the container scrolled to the end while also using
    //  `ScrollArea`. This is the least-bad way I found to scroll to the end on mount.
    setTimeout(() => threadScrollRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' }), 0);
  }, []);

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
    }
  };

  return (
    <Thread
      current={current}
      id={thread.id}
      classNames='bs-full grid-rows-[1fr_min-content_min-content] overflow-hidden'
    >
      <ScrollArea.Root classNames='col-span-2'>
        <ScrollArea.Viewport classNames='overflow-anchored after:overflow-anchor after:block after:bs-px'>
          <div role='none' className={threadLayout}>
            {thread.messages.map((message) => (
              <MessageContainer key={message.id} message={message} members={members} onDelete={handleDelete} />
            ))}
          </div>
          <div role='none' className='bs-px -mbs-px' ref={threadScrollRef} />
          <ScrollArea.Scrollbar>
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
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
        </>
      )}
    </Thread>
  );
};
