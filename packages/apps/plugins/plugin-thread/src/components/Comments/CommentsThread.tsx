//
// Copyright 2023 DXOS.org
//

import React, { type ForwardedRef, forwardRef } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import type { PublicKey } from '@dxos/keys';

import { Message, MessageTextbox, type MessageTextboxProps } from '../Message';
import { type MessagePropertiesProvider } from '../util';

export type CommentsThreadProps = {
  thread: ThreadType;
  processing?: boolean;
  identityKey: PublicKey;
  propertiesProvider: MessagePropertiesProvider;
  active?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
  onCreate?: MessageTextboxProps['onSend'];
  onDelete?: (messageId: string, idx: number) => void;
};

export const CommentsThread = forwardRef(
  (
    { thread, processing, identityKey, propertiesProvider, onCreate, onDelete }: CommentsThreadProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    return (
      <div role='none' className='grid grid-cols-[3rem_1fr]' id={thread.id} ref={ref}>
        {/* TODO(burdon): Don't show avatar/display name if same as previous. */}
        {thread.messages.map((message) => (
          <Message key={message.id} message={message} propertiesProvider={propertiesProvider} onDelete={onDelete} />
        ))}
        <MessageTextbox
          asIdentityKey={identityKey.toHex()}
          disposition='comment'
          pending={processing}
          onSend={onCreate}
        />
      </div>
    );
  },
);
