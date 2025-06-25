//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { type MessageValence } from '@dxos/react-ui-types';

import { Message } from './Message';
import { withTheme } from '../../testing';

type StoryProps = {
  valence: MessageValence;
  title: string;
  body: string;
};

const DefaultStory = ({ valence, title, body }: StoryProps) => (
  <Message.Root valence={valence}>
    <Message.Title>{title}</Message.Title>
    <Message.Content>{body}</Message.Content>
  </Message.Root>
);

export default {
  title: 'ui/react-ui-core/Message',
  component: Message,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
  argTypes: {
    valence: {
      control: 'select',
      options: ['success', 'info', 'warning', 'error', 'neutral'],
    },
  },
};

export const Default = {
  args: {
    valence: 'neutral',
    title: 'Alert title',
    body: 'Alert content',
  },
};
