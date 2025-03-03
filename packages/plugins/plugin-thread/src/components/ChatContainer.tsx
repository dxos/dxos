//
// Copyright 2023 DXOS.org
//

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Ref } from '@dxos/echo-schema';
import { create, makeRef, RefArray } from '@dxos/live-object';
import { MessageType } from '@dxos/plugin-space/types';
import { fullyQualifiedId, getSpace, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Icon, ScrollArea, useThemeContext, useTranslation } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { MessageTextbox, type MessageTextboxProps, Thread, ThreadFooter, threadLayout } from '@dxos/react-ui-thread';

import { MessageContainer } from './MessageContainer';
import { command } from './command-extension';
import { type ThreadContainerProps } from './types';
import { useStatus } from '../hooks';
import { THREAD_PLUGIN } from '../meta';
import { getMessageMetadata } from '../util';

export const ChatHeading = ({ attendableId }: { attendableId?: string }) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  return (
    <div role='none' className='flex items-center'>
      <StackItem.SigilButton attendableId={attendableId}>
        <Icon icon='ph--chat--regular' size={5} />
      </StackItem.SigilButton>
      <StackItem.HeadingLabel attendableId={attendableId}>{t('chat heading')}</StackItem.HeadingLabel>
    </div>
  );
};

export const ChatContainer = ({ thread, context, current, autoFocusTextbox }: ThreadContainerProps) => {
  const identity = useIdentity()!;
  const space = getSpace(thread);
  const members = useMembers(space?.key);
  const activity = useStatus(space, fullyQualifiedId(thread));
  const { t } = useTranslation(THREAD_PLUGIN);
  // TODO(wittjosiah): This is a hack to reset the editor after a message is sent.
  const [_count, _setCount] = useState(0);
  const rerenderEditor = () => _setCount((count) => count + 1);
  const [autoFocus, setAutoFocus] = useState(autoFocusTextbox);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const { themeMode } = useThemeContext();

  const textboxMetadata = getMessageMetadata(fullyQualifiedId(thread), identity);
  const messageRef = useRef('');
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: t('message placeholder') }),
      createThemeExtensions({ themeMode }),
      listener({ onChange: (text) => (messageRef.current = text) }),
      command,
    ],
    [themeMode, _count],
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
    if (!messageRef.current?.length) {
      return false;
    }

    thread.messages.push(
      makeRef(
        create(MessageType, {
          sender: { identityKey: identity.identityKey.toHex() },
          timestamp: new Date().toISOString(),
          text: messageRef.current,
          context: context ? makeRef(context) : undefined,
        }),
      ),
    );

    messageRef.current = '';
    setAutoFocus(true);
    scrollToEnd('smooth');
    rerenderEditor();
    return true;
  };

  const handleDelete = (id: string) => {
    const messageIndex = thread.messages.findIndex(Ref.hasObjectId(id));
    if (messageIndex !== -1) {
      thread.messages.splice(messageIndex, 1);
    }
  };

  return (
    <Thread
      current={current}
      id={fullyQualifiedId(thread)}
      classNames='bs-full grid-rows-[1fr_min-content_min-content] overflow-hidden transition-[padding-block-end] [[data-sidebar-inline-start-state=open]_&]:lg:pbe-0'
    >
      <ScrollArea.Root classNames='col-span-2'>
        <ScrollArea.Viewport classNames='overflow-anchored after:overflow-anchor after:block after:bs-px after:-mbs-px [&>div]:min-bs-full [&>div]:!grid [&>div]:grid-rows-[1fr_0]'>
          <div role='none' className={mx(threadLayout, 'place-self-end')}>
            {RefArray.allResolvedTargets(thread.messages ?? []).map((message) => (
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
      <MessageTextbox extensions={extensions} autoFocus={autoFocus} onSend={handleCreate} {...textboxMetadata} />
      <ThreadFooter activity={activity}>{t('activity message')}</ThreadFooter>
    </Thread>
  );
};
