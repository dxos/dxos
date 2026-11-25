//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import * as Agent from '@dxos/compute/Agent';
import { Feed, Obj, Ref } from '@dxos/echo';
import * as Card from '@dxos/react-ui/Card';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ChatCard } from './ChatCard.tsx';

const DefaultStory = ({ name }: { name?: string }) => {
  const subject = useMemo(() => Obj.make(Agent.Session, { name, feed: Ref.make(Feed.make()), tasks: [] }), [name]);
  return (
    <Card.Root>
      <ChatCard role='card--content' subject={subject} />
    </Card.Root>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/containers/ChatCard',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[24rem] p-4' }), withTheme()],
  parameters: { layout: 'centered', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { name: 'Plan the beta launch' } };

export const Untitled: Story = { args: {} };
