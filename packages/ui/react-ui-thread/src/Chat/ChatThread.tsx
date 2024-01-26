//
// Copyright 2023 DXOS.org
//

import React, { useRef } from 'react';

import { AnchoredOverflow, type AnchoredOverflowRootProps } from '@dxos/react-ui';
import { useInMemoryTextModel } from '@dxos/react-ui-editor';

import { MessageTextbox, type MessageTextboxProps } from '../Message';
import { type ThreadEntity } from '../types';

export type ChatThreadProps = ThreadEntity & {
  onFocus?: () => void;
  onCreate?: MessageTextboxProps['onSend'];
  onDelete?: (blockId: string, idx: number) => void;
} & Pick<MessageTextboxProps, 'pending'> &
  AnchoredOverflowRootProps;

export const ChatThread = ({
  id,
  onFocus,
  onCreate,
  onDelete,
  authorName,
  authorStatus,
  authorId,
  authorImgSrc,
  pending,
  children,
  ...rootProps
}: ChatThreadProps) => {
  const nextMessageId = `${id}__next`;
  const nextMessageModel = useInMemoryTextModel({ id: nextMessageId });
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
    <AnchoredOverflow.Root {...rootProps}>
      {children}
      <AnchoredOverflow.Anchor />
      {handleSubmit && (
        <MessageTextbox
          id={`${id}__next`}
          {...{
            authorId,
            authorName,
            authorImgSrc,
            authorStatus,
            model: nextMessageModel,
            disposition: 'message',
            onSend: handleSubmit,
          }}
        />
      )}
    </AnchoredOverflow.Root>
  );
};
