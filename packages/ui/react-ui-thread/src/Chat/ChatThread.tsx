//
// Copyright 2023 DXOS.org
//

import React, { useRef } from 'react';

import { AnchoredOverflow } from '@dxos/react-ui';

import { Message, MessageTextbox, type MessageTextboxProps } from '../Message';
import { type ThreadEntity } from '../types';

export type ChatThreadProps = ThreadEntity & {
  onFocus?: () => void;
  onCreate?: MessageTextboxProps['onSend'];
  onDelete?: (blockId: string, idx: number) => void;
} & Pick<MessageTextboxProps, 'pending' | 'model'>;

export const ChatThread = ({ onFocus, onCreate, onDelete, messages, ...props }: ChatThreadProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (text: string) => {
    if (onCreate?.(text)) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      return true;
    }
  };

  return (
    <AnchoredOverflow.Root>
      {(messages ?? []).map((message) => (
        <Message key={message.id} {...message} onDelete={onDelete} />
      ))}
      <AnchoredOverflow.Anchor />
      {handleSubmit && <MessageTextbox {...props} disposition='message' onSend={handleSubmit} />}
    </AnchoredOverflow.Root>
  );
};
