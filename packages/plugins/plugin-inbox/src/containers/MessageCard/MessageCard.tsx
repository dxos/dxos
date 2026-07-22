//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';
import { Avatar, Row } from '@dxos/react-ui-card';
import { type Message } from '@dxos/types';

import { getMessageProps } from '../../util';

export const MessageCard = ({ subject: message }: AppSurface.ObjectCardProps<Message.Message>) => {
  const { date, email, from, snippet } = getMessageProps(message, new Date(), { compact: true });
  return (
    <Card.Body>
      <Card.Header>
        <Card.Block>
          <Avatar actor={message.sender} name={from} variant='square' size={7} />
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
        <Row.Tags tags={message.properties?.tags} />
      </Card.Row>
    </Card.Body>
  );
};

MessageCard.displayName = 'MessageCard';
