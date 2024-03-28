//
// Copyright 2023 DXOS.org
//

import { Chat } from '@phosphor-icons/react';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { MessageType, TextV0Type } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { getSpaceForObject, getTextContent, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ScrollArea, useThemeContext, useTranslation } from '@dxos/react-ui';
import { PlankHeading, plankHeadingIconProps } from '@dxos/react-ui-deck';
import { automerge, createBasicExtensions, createThemeExtensions, useDocAccessor } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { MessageTextbox, type MessageTextboxProps, Thread, ThreadFooter, threadLayout } from '@dxos/react-ui-thread';
import { nonNullable } from '@dxos/util';

import { MessageContainer } from './MessageContainer';
import { command } from './command-extension';
import { type ThreadContainerProps } from './types';
import { useStatus } from '../hooks';
import { THREAD_PLUGIN } from '../meta';
import { getMessageMetadata } from '../util';

export const ChatHeading = ({ attendableId }: { attendableId?: string }) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  return (
    <div
      role='none'
      className='grid grid-cols-[var(--rail-size)_1fr_var(--rail-size)] items-center border-be separator-separator -mbe-px'
    >
      <PlankHeading.Button attendableId={attendableId}>
        <Chat {...plankHeadingIconProps} />
      </PlankHeading.Button>
      <PlankHeading.Label attendableId={attendableId}>{t('chat heading')}</PlankHeading.Label>
    </div>
  );
};

export const ChatContainer = ({ thread, context, current, autoFocusTextbox }: ThreadContainerProps) => {
  const identity = useIdentity()!;
  const space = getSpaceForObject(thread);
  const members = useMembers(space?.key);
  const activity = useStatus(space, thread.id);
  const { t } = useTranslation(THREAD_PLUGIN);
  const [autoFocus, setAutoFocus] = useState(autoFocusTextbox);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const { themeMode } = useThemeContext();

  const textboxMetadata = getMessageMetadata(thread.id, identity);
  const [nextMessage, setNextMessage] = useState({ text: E.object(TextV0Type, { content: '' }) });
  const { doc, accessor } = useDocAccessor(nextMessage.text);
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: t('message placeholder') }),
      createThemeExtensions({ themeMode }),
      automerge(accessor),
      command,
    ],
    [themeMode, accessor],
  );

  // TODO(thure): Factor out.
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

    thread.messages.push(
      E.object(MessageType, {
        from: { identityKey: identity.identityKey.toHex() },
        context,
        blocks: [
          {
            timestamp: new Date().toISOString(),
            content,
          },
        ],
      }),
    );

    setNextMessage(() => {
      return { text: E.object(TextV0Type, { content: '' }) };
    });

    setAutoFocus(true);

    scrollToEnd('smooth');
    return true;
  };

  const handleDelete = (id: string, index: number) => {
    const messageIndex = thread.messages.filter(nonNullable).findIndex((message) => message.id === id);
    if (messageIndex !== -1) {
      const message = thread.messages[messageIndex];
      message?.blocks.splice(index, 1);
      if (message?.blocks.length === 0) {
        thread.messages.splice(messageIndex, 1);
      }
    }
  };

  return (
    <Thread
      current={current}
      id={thread.id}
      classNames='bs-full grid-rows-[1fr_min-content_min-content] overflow-hidden transition-[padding-block-end] [[data-sidebar-inline-start-state=open]_&]:lg:pbe-0'
    >
      <ScrollArea.Root classNames='col-span-2'>
        <ScrollArea.Viewport classNames='overflow-anchored after:overflow-anchor after:block after:bs-px after:-mbs-px [&>div]:min-bs-full [&>div]:!grid [&>div]:grid-rows-[1fr_0]'>
          <div role='none' className={mx(threadLayout, 'place-self-end')}>
            {thread.messages.filter(nonNullable).map((message) => (
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
      <MessageTextbox
        doc={doc}
        extensions={extensions}
        autoFocus={autoFocus}
        onSend={handleCreate}
        {...textboxMetadata}
      />
      <ThreadFooter activity={activity}>{t('activity message')}</ThreadFooter>
    </Thread>
  );
};
