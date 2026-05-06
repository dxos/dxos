//
// Copyright 2026 DXOS.org
//

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { type Space, useMembers, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ScrollArea, type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  MessageTextbox,
  type MessageTextboxProps,
  Thread as ThreadComponent,
  type ThreadRootProps,
  threadLayout,
} from '@dxos/react-ui-thread';
import { type Channel, Message } from '@dxos/types';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';
import { composable, composableProps, mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { MessagePanel } from '#components';
import { useStatus } from '#hooks';
import { meta } from '#meta';

import { command } from '../../extensions';
import { ThreadOperation } from '../../operations';
import { getMessageMetadata } from '../../util';

export type ChannelChatProps = ThemedClassName<
  {
    space: Space;
    channel: Channel.Channel;
    autoFocusTextbox?: boolean;
  } & Pick<ThreadRootProps, 'current'>
>;

/**
 * Renders a flat list of messages from a feed-backed Channel, with a textbox to append.
 * Threading via Message.threadId is intentionally not reconstructed in this round.
 */
export const ChannelChat = composable<HTMLDivElement, ChannelChatProps>(
  ({ space, channel, autoFocusTextbox, current, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();

    const id = Obj.getDXN(channel).toString();
    const identity = useIdentity()!;
    const members = useMembers(space?.id);
    const activity = useStatus(space, id);
    const [autoFocus, setAutoFocus] = useState(autoFocusTextbox);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const { invokePromise } = useOperationInvoker();

    const feed = channel.feed?.target;
    const messages = useQuery(
      space.db,
      feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
    ) as Message.Message[];

    const [_count, _setCount] = useState(0);
    const rerenderEditor = () => _setCount((count) => count + 1);

    const textboxMetadata = getMessageMetadata(id, identity);
    const messageRef = useRef('');
    const extensions = useMemo(
      () => [
        createBasicExtensions({ placeholder: t('message.placeholder') }),
        createThemeExtensions({ themeMode }),
        listener({ onChange: ({ text }) => (messageRef.current = text) }),
        command,
      ],
      [themeMode, _count],
    );

    const scrollToEnd = (behavior: ScrollBehavior) =>
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior, block: 'end' }), 10);

    useLayoutEffect(() => {
      scrollToEnd('instant');
    }, []);

    const handleSend: MessageTextboxProps['onSend'] = () => {
      if (!messageRef.current?.length) {
        return false;
      }

      void invokePromise(ThreadOperation.AppendChannelMessage, {
        channel,
        sender: { identityDid: identity.did },
        text: messageRef.current,
      });

      messageRef.current = '';
      setAutoFocus(true);
      scrollToEnd('smooth');
      rerenderEditor();
      return true;
    };

    return (
      <ThreadComponent.Root
        {...composableProps(props, {
          classNames: 'dx-container grid-rows-[1fr_min-content_min-content]',
        })}
        id={id}
        current={current}
        ref={forwardedRef}
      >
        <ScrollArea.Root classNames='col-span-2' orientation='vertical'>
          <ScrollArea.Viewport ref={scrollRef}>
            <div role='none' className={mx(threadLayout, 'place-self-end')}>
              {messages.filter(isNonNullable).map((message) => (
                <MessagePanel key={message.id} message={message} members={members} />
              ))}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>

        <MessageTextbox extensions={extensions} autoFocus={autoFocus} onSend={handleSend} {...textboxMetadata} />
        <ThreadComponent.Status activity={activity}>{t('activity.message')}</ThreadComponent.Status>
      </ThreadComponent.Root>
    );
  },
);
