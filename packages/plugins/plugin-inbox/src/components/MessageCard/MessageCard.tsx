//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { DxAvatar } from '@dxos/lit-ui/react';
import { Card } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';
import { getFirstTwoRenderableChars } from '@dxos/util';

import { type Tag } from '../Mailbox';
import { getMessageProps } from '../util';

export type MessageCardProps = {
  message: DataType.Message;
  role?: string;
};

export const MessageCard = ({ message, role }: MessageCardProps) => {
  const { date, email, from, hue, subject, snippet } = getMessageProps(message);
  return (
    <Card.SurfaceRoot role={role} classNames='grid grid-cols-[52px_1fr] grid-rows-[min-content_1fr] overflow-hidden'>
      <div role='none' className='grid aspect-square place-items-center'>
        <DxAvatar
          hue={hue}
          hueVariant='surface'
          variant='square'
          size={10}
          fallback={from ? getFirstTwoRenderableChars(from).join('') : '?'}
        />
      </div>
      <div role='none' className='p-1 pie-2'>
        <div role='none' className='flex items-center gap-1'>
          <p className='grow truncate'>{from}</p>
          <p className='text-xs text-subdued whitespace-nowrap'>{date}</p>
        </div>
        <p className='text-xs text-subdued whitespace-nowrap'>{email}</p>
      </div>
      <div />
      <div role='none' className='p-1 pie-2 overflow-hidden'>
        <p className='text-sm truncate'>{subject}</p>
        <p className='line-clamp-4 text-sm text-description'>{snippet}</p>
        {message.properties?.tags && (
          <div role='none'>
            {message.properties.tags.map(({ label, hue }: Tag) => (
              <span className='dx-tag' key={label} data-label={label} data-hue={hue}>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card.SurfaceRoot>
  );
};
