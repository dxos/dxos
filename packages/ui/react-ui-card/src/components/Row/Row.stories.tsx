//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Actor, Person } from '@dxos/types';

import { translations } from '#translations';

import { Row } from './Row';

const SENDER: Actor.Actor = { name: 'Alice Avery', email: 'alice@example.com' };

// Exercises each shared Card-row primitive inside the borderless Card chrome the tiles/headers use.
const DefaultStory = () => {
  const object = useMemo(() => Obj.make(Person.Person, { fullName: 'Casey Contact' }), []);
  // A second stand-in object so the two attachment refs below have distinct URIs (and React keys).
  const secondObject = useMemo(() => Obj.make(Person.Person, { fullName: 'Dana Reference' }), []);

  return (
    <Card.Root border={false} fullWidth classNames='p-1'>
      <Card.Body>
        <Row.Star starred onToggle={() => {}} />
        <Row.Person actor={SENDER} role='from' avatar />
        <Row.Person actor={SENDER} role='from' onContactCreate={() => {}} />
        <Row.Date start={new Date('2025-11-19T12:00:00')} end={new Date('2025-11-19T13:30:00')} />
        <Row.Ref object={object} />
        <Row.Attachments
          attachments={[
            { name: 'invoice.pdf', ref: Ref.make(object) },
            { name: 'photo.png', ref: Ref.make(secondObject) },
          ]}
        />
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
  title: 'ui/react-ui-card/Row',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
