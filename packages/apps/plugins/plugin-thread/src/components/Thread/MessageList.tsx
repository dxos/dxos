//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';

export type MessageListProps = {
  messages?: ThreadType.Message[];
};

// TODO(burdon): Use List (see composer settings/kai).
// TODO(burdon): Master/detail, message body.

export const MessageList = ({ messages = [] }: MessageListProps) => {
  return (
    <div className='flex flex-col grow max-w-[400px] overflow-hidden'>
      <div className='flex flex-col overflow-y-auto divide-y'>
        {messages?.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
};

export const MessageItem: FC<{ message: ThreadType.Message }> = ({ message }) => {
  return <div className='flex items-center p-1'>{message.subject}</div>;
};
