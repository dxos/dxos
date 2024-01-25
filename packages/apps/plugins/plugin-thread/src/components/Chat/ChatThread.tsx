//
// Copyright 2023 DXOS.org
//

import React, { useRef } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import { type PublicKey } from '@dxos/client';
import { mx } from '@dxos/react-ui-theme';

import { Message, MessageTextbox, type MessageTextboxProps } from '../Message';
import { type MessagePropertiesProvider } from '../util';

export type ChatThreadProps = {
  thread: ThreadType;
  identityKey: PublicKey;
  propertiesProvider: MessagePropertiesProvider;
  fullWidth?: boolean;
  onFocus?: () => void;
  onCreate?: MessageTextboxProps['onSend'];
  onDelete?: (blockId: string, idx: number) => void;
} & Pick<MessageTextboxProps, 'pending'>;

export const ChatThread = ({
  thread,
  identityKey,
  propertiesProvider,
  fullWidth = true,
  onFocus,
  onCreate,
  onDelete,
  ...props
}: ChatThreadProps) => {
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
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex flex-col-reverse grow overflow-auto px-2 pt-4'>
        <div ref={bottomRef} />
        {(thread.messages ?? [])
          .map((message) => (
            <div
              key={message.id}
              className={mx(
                'flex my-1',
                !fullWidth && identityKey.toHex() === message.from?.identityKey && 'justify-end',
              )}
            >
              <div className={mx('flex flex-col', fullWidth ? 'w-full' : 'md:min-w-[400px] max-w-[600px]')}>
                <Message message={message} propertiesProvider={propertiesProvider} onDelete={onDelete} />
              </div>
            </div>
          ))
          .reverse()}
      </div>

      {handleSubmit && (
        <div className='flex px-2 py-2'>
          <MessageTextbox asIdentityKey={identityKey.toHex()} disposition='message' onSend={handleSubmit} {...props} />
        </div>
      )}
    </div>
  );
};
