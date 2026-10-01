//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Flex } from '@dxos/react-ui';
import { Avatar, Row } from '@dxos/react-ui-card';
import { Next } from '@dxos/react-ui/next';
import { type Message } from '@dxos/types';

import { getMessageProps } from '../../util/index.ts';

export const MessageCard = ({ subject: message }: AppSurface.ObjectCardProps<Message.Message>) => {
  const { date, email, from, snippet } = getMessageProps(message, new Date(), { compact: true });
  return (
    <Next.Card.Body>
      <Next.Card.Header>
        <Next.Block>
          <Avatar actor={message.sender} name={from} variant='square' size={7} />
        </Next.Block>
        <Flex gap='md' align='center' justify='between' classNames='col-span-2'>
          <span className='grow truncate'>{from}</span>
          <span className='text-xs text-description text-right whitespace-nowrap pe-2'>{date}</span>
        </Flex>
      </Next.Card.Header>
      <Next.Card.Row>
        <p className='text-xs text-description text-info-text'>{email}</p>
      </Next.Card.Row>
      <Next.Card.Row>
        <Next.Card.Text variant='description'>{snippet}</Next.Card.Text>
      </Next.Card.Row>
      <Next.Card.Row>
        <Row.Tags tags={message.properties?.tags} />
      </Next.Card.Row>
    </Next.Card.Body>
  );
};

MessageCard.displayName = 'MessageCard';
