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
  const { date, from, hue, subject, snippet } = getMessageProps(message);
  return (
    <Card.SurfaceRoot role={role} classNames='grid grid-cols-[52px_1fr] grid-rows-[min-content_1fr]'>
      <div role='none' className='grid aspect-square place-items-center'>
        <DxAvatar
          hue={hue}
          hueVariant='surface'
          variant='square'
          size={10}
          fallback={from ? getFirstTwoRenderableChars(from).join('') : '?'}
        />
      </div>
      <div role='none' className='pis-0 pie-2 pbs-1 pbs-1'>
        <div className='flex items-center gap-1'>
          <p className='grow truncate'>{from}</p>
          <p className='text-xs text-subdued'>{date}</p>
        </div>
        <p className='line-clamp-1 text-sm'>{subject}</p>
      </div>
      <div />
      <div>
        <p className='p-1 pis-0 line-clamp-4 text-sm text-description'>{snippet}</p>
        {message.properties?.tags && (
          <div className=''>
            {message.properties.tags.map(({ label, hue }: Tag) => (
              <div className='dx-tag' key={label} data-label={label} data-hue={hue}>
                {label}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card.SurfaceRoot>
  );
};
