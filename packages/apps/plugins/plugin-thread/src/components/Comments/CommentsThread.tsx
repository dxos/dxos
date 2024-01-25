//
// Copyright 2023 DXOS.org
//

import React, { type ForwardedRef, forwardRef } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import type { PublicKey } from '@dxos/keys';
import { fixedBorder, attentionSurface, mx } from '@dxos/react-ui-theme';

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
    {
      thread,
      processing,
      identityKey,
      propertiesProvider,
      active,
      autoFocus,
      onFocus,
      onCreate,
      onDelete,
    }: CommentsThreadProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    return (
      <div
        className={mx(
          'flex flex-col rounded shadow divide-y',
          attentionSurface,
          fixedBorder,
          onCreate ? '' : 'opacity-60',
        )}
        onClick={() => {
          onFocus?.();
        }}
      >
        {/* TODO(burdon): Don't show avatar/display name if same as previous. */}
        {thread.messages.map((message) => (
          <Message key={message.id} message={message} propertiesProvider={propertiesProvider} onDelete={onDelete} />
        ))}
        <div ref={ref} role='none' className={mx(!active && 'hidden')}>
          <MessageTextbox
            asIdentityKey={identityKey.toHex()}
            disposition='comment'
            pending={processing}
            onSend={onCreate}
          />
        </div>
      </div>
    );
  },
);
