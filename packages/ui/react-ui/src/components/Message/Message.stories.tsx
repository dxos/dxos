//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { Info } from '@phosphor-icons/react';
import React from 'react';

import { type MessageValence } from '@dxos/react-ui-types';

import { Message } from './Message';
import { withTheme } from '../../testing';

type StoryMessageProps = {
  valence: MessageValence;
  title: string;
  body: string;
};

const StoryMessage = ({ valence, title, body }: StoryMessageProps) => (
  <Message.Root valence={valence}>
    <Message.Title>
      <Info className='mb-1 inline h-5 w-5' weight='duotone' /> {title}
    </Message.Title>
    <Message.Body>{body}</Message.Body>
  </Message.Root>
);

export default {
  title: 'react-ui/Message',
  component: StoryMessage,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    valence: 'error',
    title: 'Alert title',
    body: 'Alert content',
  },
};
