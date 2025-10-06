//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type MessageValence } from '@dxos/react-ui-types';

import { withTheme } from '../../testing';

import { Callout } from './Message';

type StoryProps = {
  valence: MessageValence;
  title: string;
  body: string;
};

const DefaultStory = ({ valence, title, body }: StoryProps) => (
  <Callout.Root valence={valence}>
    {title && <Callout.Title>{title}</Callout.Title>}
    {body && <Callout.Content>{body}</Callout.Content>}
  </Callout.Root>
);

const meta = {
  title: 'ui/react-ui-core/Callout',
  component: Callout.Root as any,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
  argTypes: {
    valence: {
      control: 'select',
      options: ['success', 'info', 'warning', 'error', 'neutral'],
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    valence: 'neutral',
    title: 'Alert title',
    body: 'Alert content',
  },
};
