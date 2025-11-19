//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

//
// Context
//

type MessageContextValue = {};

const [MessageContextProvider, useMessageContext] = createContext<MessageContextValue>('Message');

//
// Root
//

type MessageRootProps = PropsWithChildren;

const MessageRoot = ({ children }: MessageRootProps) => {
  return <MessageContextProvider>{children}</MessageContextProvider>;
};

MessageRoot.displayName = 'Message.Root';

//
// Content
//

type MessageContentProps = ThemedClassName<{}>;

const MessageContent = ({ classNames }: MessageContentProps) => {
  const context = useMessageContext(MessageContent.displayName);
  return <div className={mx(classNames)}>{JSON.stringify(context)}</div>;
};

MessageContent.displayName = 'Message.Content';

//
// Message
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Message = {
  Root: MessageRoot,
  Content: MessageContent,
};

export type { MessageRootProps, MessageContentProps };
