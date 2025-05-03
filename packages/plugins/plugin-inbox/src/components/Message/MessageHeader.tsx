//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Avatar } from '@dxos/react-ui';
import { type ThemedClassName } from '@dxos/react-ui';
import { type MessageType } from '@dxos/schema';
import { getFirstTwoRenderableChars, toHue } from '@dxos/util';

import { formatDate, hashString } from '../util';

export type MessageHeaderProps = ThemedClassName<{
  message: MessageType;
}>;

export const MessageHeader = ({ message, classNames }: MessageHeaderProps) => {
  return (
    <div className='grid grid-flow-row p-2 gap-2 pb-3 min-bs-0 border-be border-separator'>
      <div className='grid grid-cols-[auto_1fr_auto] gap-x-3'>
        <Avatar.Root>
          <Avatar.Content
            hue={message.sender.name ? toHue(hashString(message.sender.name)) : undefined}
            hueVariant='surface'
            variant='square'
            size={8}
            fallback={message.sender.name ? getFirstTwoRenderableChars(message.sender.name).join('') : '?'}
            classNames='self-center'
          />
          <Avatar.Label srOnly>{message.sender.name || 'Unknown'}</Avatar.Label>
        </Avatar.Root>
        <div className='grid gap-0.5 self-center'>
          <h3>{message.sender.name || 'Unknown'}</h3>
          {message.sender.email && <div className='text-xs text-description'>{message.sender.email}</div>}
        </div>
        <div className='text-xs text-description justify-self-end self-start'>
          {message.created && formatDate(new Date(), new Date(message.created))}
        </div>
      </div>

      {message.properties?.subject && <div className='text-sm font-medium pl-11'>{message.properties.subject}</div>}
    </div>
  );
};
