//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Card } from '@dxos/react-ui';
import { Row } from '@dxos/react-ui-card';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Actor, Person } from '@dxos/types';

import { translations } from '#translations';

import { Header } from './Header';

const SENDER: Actor.Actor = { name: 'Alice Avery', email: 'alice@example.com' };

// Header.Root chrome composing shared Row.* primitives — the structure both article headers use.
const DefaultStory = () => {
  const { space } = useClientStory();
  return (
    <Header.Root>
      <Card.Row>
        <Card.Block>
          <Row.Star starred onToggle={() => {}} />
        </Card.Block>
        <Card.Text classNames='text-lg line-clamp-2'>Quarterly planning sync</Card.Text>
      </Card.Row>
      <Row.Person actor={SENDER} role='from' db={space?.db} onContactCreate={() => {}} />
      <Row.Date start={new Date('2025-11-19T12:00:00')} end={new Date('2025-11-19T13:00:00')} />
      <Row.Tags tags={[{ id: 'a', label: 'planning', hue: 'cyan' }]} />
    </Header.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/Header',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({ types: [Person.Person], createIdentity: true, createSpace: true }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
