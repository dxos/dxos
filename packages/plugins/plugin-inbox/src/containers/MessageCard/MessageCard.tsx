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

export const MessageCard = ({ subject: message }: AppSurface.ObjectCardProps<Message.Message>) => {
  const { date, email, from, hue, snippet } = getMessageProps(message, new Date(), { compact: true });
  return (
    <Card.Body>
      <Card.Header>
        <Card.Block>
          <DxAvatar hue={hue} hueVariant='surface' variant='square' size={7} fallback={from} />
        </Card.Block>
        <div className='flex gap-3 items-center justify-between col-span-2'>
          <span className='grow truncate'>{from}</span>
          <span className='text-xs text-description text-right whitespace-nowrap pe-2'>{date}</span>
        </div>
      </Card.Header>
      <Card.Row>
        <p className='text-xs text-description text-info-text'>{email}</p>
      </Card.Row>
      <Card.Row>
        <Card.Text variant='description'>{snippet}</Card.Text>
      </Card.Row>
      <Card.Row>
        {message.properties?.tags && (
          <div>
            {message.properties.tags.map(({ label, hue }: Tag.Tag) => (
              <span className='dx-tag' key={label} data-label={label} data-hue={hue}>
                {label}
              </span>
            ))}
          </div>
        )}
      </Card.Row>
    </Card.Body>
  );
};
