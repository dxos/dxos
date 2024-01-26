//
// Copyright 2023 DXOS.org
//

import React, { type ForwardedRef, forwardRef } from 'react';

import { useInMemoryTextModel } from '@dxos/react-ui-editor';

import { Message, MessageTextbox, type MessageTextboxProps } from '../Message';
import type { ThreadEntity } from '../types';

export type CommentsThreadProps = ThreadEntity & {
  pending?: boolean;
  onFocus?: () => void;
  onCreate?: MessageTextboxProps['onSend'];
  onDelete?: (messageId: string, idx: number) => void;
};

export const CommentsThread = forwardRef(
  ({ onFocus, onCreate, onDelete, messages, id, ...props }: CommentsThreadProps, ref: ForwardedRef<HTMLDivElement>) => {
    const nextMessageId = `${id}__next`;
    const nextMessageModel = useInMemoryTextModel({ id: nextMessageId });
    return (
      <div role='none' className='grid grid-cols-[3rem_1fr]' id={id} ref={ref}>
        {/* TODO(burdon): Don't show avatar/display name if same as previous. */}
        {messages.map((message) => (
          <Message key={message.id} {...message} onDelete={onDelete} />
        ))}
        <MessageTextbox
          {...props}
          id={nextMessageId}
          disposition='comment'
          onSend={onCreate}
          model={nextMessageModel}
        />
      </div>
    );
  },
);
