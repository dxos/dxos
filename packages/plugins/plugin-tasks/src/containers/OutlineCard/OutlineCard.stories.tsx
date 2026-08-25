//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Card } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';
import { trim } from '@dxos/util';

import { translations } from '#translations';

import { OutlineCard } from './OutlineCard';

const CONTENT = trim`
  - [ ] Draft the launch announcement
  - [ ] Review pricing page
    - [ ] Collect competitor quotes
    - [ ] Update the FAQ
  - [ ] Schedule the retro
`;

type StoryArgs = {
  content?: string;
  name?: string;
};

/**
 * The card is a surface: its chrome (border, heading, menu) comes from the `Card.Root` the caller
 * renders, so the story supplies one — a card rendering its own root drew a second border.
 */
const DefaultStory = ({ content, name }: StoryArgs) => {
  const [space] = useSpaces();
  const outline = useMemo(() => space && space.db.add(Outline.make({ name, content })), [space, name, content]);
  if (!outline) {
    return null;
  }

  return (
    <div className='p-4 w-96'>
      <Card.Root id={outline.id}>
        <Card.Header>
          <Card.Title>{name ?? 'Untitled'}</Card.Title>
        </Card.Header>
        <OutlineCard role='card' subject={outline} />
      </Card.Root>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-tasks/containers/OutlineCard',
  decorators: [
    withTheme(),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Text.Text, Outline.Outline],
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DefaultStory content={CONTENT} name='Launch plan' />,
};

export const Empty: Story = {
  render: () => <DefaultStory />,
};
