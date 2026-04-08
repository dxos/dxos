//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Tag } from '@dxos/echo';
import { DxAvatar } from '@dxos/lit-ui/react';
import { Card } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { getMessageProps } from '../../util';

export const MessageCard = ({ subject: message }: AppSurface.ObjectProps<Message.Message>) => {
  const { date, email, from, hue, snippet } = getMessageProps(message, new Date(), true);
  return (
    <Card.Content>
      <Card.Toolbar>
        <Card.IconBlock>
          <DxAvatar hue={hue} hueVariant='surface' variant='square' size={7} fallback={from} />
        </Card.IconBlock>
        <div className='flex gap-3 items-center justify-between col-span-2'>
          <span className='grow truncate'>{from}</span>
          <span className='text-xs text-description text-right whitespace-nowrap pe-2'>{date}</span>
        </div>
      </Card.Toolbar>
      <Card.Row>
        <p className='text-xs text-description text-info-text'>{email}</p>
      </Card.Row>
      <Card.Row>
        <Card.Text variant='description'>{snippet}</Card.Text>
      </Card.Row>
      <Card.Row>
        {message.properties?.tags && (
          <div role='none'>
            {message.properties.tags.map(({ label, hue }: Tag.Tag) => (
              <span className='dx-tag' key={label} data-label={label} data-hue={hue}>
                {label}
              </span>
            ))}
          </div>
        )}
      </Card.Row>
    </Card.Content>
  );
};
