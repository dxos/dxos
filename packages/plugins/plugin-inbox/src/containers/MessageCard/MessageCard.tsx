//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Avatar, Row } from '@dxos/react-ui-card';
import * as Card from '@dxos/react-ui/Card';
import * as Layout from '@dxos/react-ui/Layout';
import { type Message } from '@dxos/types';

import { getMessageProps } from '../../util/index.ts';

export const MessageCard = ({ subject: message }: AppSurface.ObjectCardProps<Message.Message>) => {
  const { date, email, from, snippet } = getMessageProps(message, new Date(), { compact: true });
  return (
    <Card.Body>
      <Card.Header>
        <Layout.Block>
          <Avatar actor={message.sender} name={from} variant='square' size={7} />
        </Layout.Block>
        <Layout.Flex gap='md' align='center' justify='between' classNames='col-span-2'>
          <span className='grow truncate'>{from}</span>
          <span className='text-xs text-fg-muted text-right whitespace-nowrap pe-2'>{date}</span>
        </Layout.Flex>
      </Card.Header>
      <Card.Row>
        <p className='text-xs text-fg-muted text-info-text'>{email}</p>
      </Card.Row>
      <Card.Row>
        <Card.Text variant='muted'>{snippet}</Card.Text>
      </Card.Row>
      <Card.Row>
        <Row.Tags tags={message.properties?.tags} />
      </Card.Row>
    </Card.Body>
  );
};

MessageCard.displayName = 'MessageCard';
