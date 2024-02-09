//
// Copyright 2023 DXOS.org
//

import React, { useLayoutEffect, useRef, useState } from 'react';

import { Message as MessageType } from '@braneframe/types';
import { TextObject, getTextContent, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ScrollArea, useTranslation } from '@dxos/react-ui';
import { useTextModel } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { MessageTextbox, type MessageTextboxProps, Thread, ThreadFooter, threadLayout } from '@dxos/react-ui-thread';

import { MessageContainer } from './MessageContainer';
import { command } from './command-extension';
import { type ThreadContainerProps } from './types';
import { useStatus, useMessageMetadata } from '../hooks';
import { THREAD_PLUGIN } from '../meta';

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

  // TODO(thure): `flex-col-reverse` does not work to start the container scrolled to the end while also using
  //  `ScrollArea`. This is the least-bad way I found to scroll to the end on mount. Note that 0ms was insufficient
  //  for the desired effect; this is likely hardware-dependent and should be reevaluated.
  const scrollToEnd = (behavior: ScrollBehavior) =>
    setTimeout(() => threadScrollRef.current?.scrollIntoView({ behavior, block: 'end' }), 10);

  useLayoutEffect(() => {
    scrollToEnd('instant');
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

    scrollToEnd('smooth');

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
        <ScrollArea.Viewport classNames='overflow-anchored after:overflow-anchor after:block after:bs-px after:-mbs-px [&>div]:min-bs-full [&>div]:!grid [&>div]:grid-rows-[1fr_0]'>
          <div role='none' className={mx(threadLayout, 'place-self-end')}>
            {thread.messages.map((message) => (
              <MessageContainer key={message.id} message={message} members={members} onDelete={handleDelete} />
            ))}
          </div>
          {/* NOTE(thure): This can’t also be the `overflow-anchor` because `ScrollArea` injects an interceding node that contains this necessary ref’d element. */}
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
