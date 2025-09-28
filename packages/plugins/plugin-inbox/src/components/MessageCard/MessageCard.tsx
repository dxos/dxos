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
  const { date, from, hue, subject } = getMessageProps(message);
  return (
    <Card.SurfaceRoot role={role} classNames='message message__card'>
      <div role='none' className='message__thumb'>
        <DxAvatar
          hue={hue}
          hueVariant='surface'
          variant='square'
          size={8}
          fallback={from ? getFirstTwoRenderableChars(from).join('') : '?'}
        />
      </div>
      <div role='none' className='message__abstract'>
        <p className='message__abstract__heading'>
          <span className='message__abstract__from'>{from}</span>
          <span className='message__abstract__date'>{date}</span>
        </p>
        <p className='message__snippet'>{subject}</p>$
        {message.properties?.tags && (
          <div className='message__tags'>
            {message.properties.tags
              .map(
                ({ label, hue }: Tag) =>
                  `<div class="dx-tag message__tags-item" data-label="${label}" data-hue=${hue}>${label}</div>`,
              )
              .join('\n')}
          </div>
        )}
      </div>
    </Card.SurfaceRoot>
  );
};
