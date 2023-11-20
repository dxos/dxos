//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Message as MessageType } from '@braneframe/types';

export type MessageListProps = {
  messages?: MessageType[];
};

// TODO(burdon): Use List (see composer settings/kai).
// TODO(burdon): Master/detail, message body.
// TODO(burdon): Display chat/inbox style depending on type?

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

export const MessageItem: FC<{ message: MessageType }> = ({ message }) => {
  const subject = message.subject ?? message.blocks[0].text;
  return <div className='flex items-center p-1'>{subject}</div>;
};
