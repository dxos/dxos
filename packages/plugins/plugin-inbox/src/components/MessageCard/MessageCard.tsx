//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Tag } from '@dxos/echo';
import { DxAvatar } from '@dxos/lit-ui/react';
import { Card } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { getMessageProps } from '../../util';

export type MessageCardProps = {
  message: DataType.Message;
  role?: string;
};

export const MessageCard = ({ message, role }: MessageCardProps) => {
  const { date, email, from, hue, subject, snippet } = getMessageProps(message, new Date(), true);
  return (
    <Card.SurfaceRoot role={role} classNames='grid grid-cols-[52px_1fr] grid-rows-[min-content_1fr] overflow-hidden'>
      <div role='none' className='grid aspect-square place-items-center'>
        <DxAvatar hue={hue} hueVariant='surface' variant='square' size={10} fallback={from} />
      </div>
      <div role='none' className='p-1 pie-2 overflow-hidden'>
        <div role='none' className='flex items-center gap-2'>
          <p className='grow truncate'>{from}</p>
          <p className='text-xs text-description whitespace-nowrap'>{date}</p>
        </div>
        <p className='text-xs text-description'>{email}</p>
      </div>
      <div />
      <div role='none' className='flex flex-col gap-1 p-1 pbs-0 pie-2 overflow-hidden'>
        <p className='text-sm truncate'>{subject}</p>
        <p className='line-clamp-3 text-sm text-description'>{snippet}</p>
        {message.properties?.tags && (
          <div role='none'>
            {message.properties.tags.map(({ label, hue }: Tag.Tag) => (
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
