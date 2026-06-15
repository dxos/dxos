//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { type Database } from '@dxos/echo';
import { createObject } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Actor, Person } from '@dxos/types';

import { translations } from '#translations';

import { Row } from './Row';

const SENDER: Actor.Actor = { name: 'Alice Avery', email: 'alice@example.com' };

// Exercises each shared Card-row primitive inside the borderless Card chrome the tiles/headers use.
const DefaultStory = () => {
  const { space } = useClientStory();
  const db: Database.Database | undefined = space?.db;
  const object = useMemo(
    () => (db ? createObject(Person.make({ fullName: 'Casey Contact' })) : undefined),
    [db],
  );

  return (
    <Card.Root border={false} fullWidth classNames='p-1'>
      <Card.Body>
        <Row.Star starred onToggle={() => {}} />
        <Row.Person actor={SENDER} role='from' avatar />
        <Row.Person actor={SENDER} role='from' db={db} onContactCreate={() => {}} />
        <Row.Date start={new Date('2025-11-19T12:00:00')} end={new Date('2025-11-19T13:30:00')} />
        {object && <Row.Ref object={object} />}
        <Row.Tags
          tags={[
            { id: 'a', label: 'travel', hue: 'cyan' },
            { id: 'b', label: 'urgent', hue: 'rose' },
          ]}
          onTagClick={() => {}}
        />
      </Card.Body>
    </Card.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/Row',
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
