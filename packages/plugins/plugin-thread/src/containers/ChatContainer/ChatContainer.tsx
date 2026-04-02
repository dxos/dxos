//
// Copyright 2023 DXOS.org
//

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ScrollArea, type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  MessageTextbox,
  type MessageTextboxProps,
  Thread as ThreadComponent,
  type ThreadRootProps,
  threadLayout,
} from '@dxos/react-ui-thread';
import { Message, type Thread } from '@dxos/types';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';
import { composable, composableProps, mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { MessagePanel } from '../../components';
import { command } from '../../extensions';
import { useStatus } from '../../hooks';
import { meta } from '../../meta';
import { getMessageMetadata } from '../../util';

export type ChatContainerProps = ThemedClassName<
  {
    space: Space;
    thread: Thread.Thread;
    context?: Obj.Unknown;
    autoFocusTextbox?: boolean;
  } & Pick<ThreadRootProps, 'current'>
>;

export const ChatContainer = composable<HTMLDivElement, ChatContainerProps>(
  ({ space, thread, context, autoFocusTextbox, current, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();

    const id = Obj.getDXN(thread).toString();
    const identity = useIdentity()!;
    const members = useMembers(space?.id);
    const activity = useStatus(space, id);
    const [autoFocus, setAutoFocus] = useState(autoFocusTextbox);
    const threadScrollRef = useRef<HTMLDivElement | null>(null);

    // TODO(wittjosiah): This is a hack to reset the editor after a message is sent.
    const [_count, _setCount] = useState(0);
    const rerenderEditor = () => _setCount((count) => count + 1);

    const textboxMetadata = getMessageMetadata(id, identity);
    const messageRef = useRef('');
    const extensions = useMemo(
      () => [
        createBasicExtensions({ placeholder: t('message placeholder') }),
        createThemeExtensions({ themeMode }),
        listener({ onChange: ({ text }) => (messageRef.current = text) }),
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

      Obj.change(thread, (obj) => {
        obj.messages.push(
          Ref.make(
            Obj.make(Message.Message, {
              created: new Date().toISOString(),
              sender: { identityDid: identity.did },
              blocks: [{ _tag: 'text', text: messageRef.current }],
              properties: context ? { context: Ref.make(context) } : undefined,
            }),
          ),
        );
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
          <ScrollArea.Viewport ref={threadScrollRef}>
            <div role='none' className={mx(threadLayout, 'place-self-end')}>
              {thread.messages
                .map((message) => message.target)
                .filter(isNonNullable)
                .map((message) => (
                  <MessagePanel key={message.id} message={message} members={members} />
                ))}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>

        <MessageTextbox extensions={extensions} autoFocus={autoFocus} onSend={handleCreate} {...textboxMetadata} />
        <ThreadComponent.Status activity={activity}>{t('activity message')}</ThreadComponent.Status>
      </ThreadComponent.Root>
    );
  },
);
