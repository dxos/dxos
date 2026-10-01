//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React from 'react';

import { Next } from '@dxos/react-ui/next';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Form } from './Form.tsx';

/**
 * Alignment harness for a form hosted inside a Card.
 *
 * `Form.Viewport` used to declare its own gutter grid, so a hosted form's fields inset by the
 * form's gutter (8px) while the card's own rows inset by the card's (32px) — the two never lined
 * up, and call sites grew three different workarounds. It now detects the host Column and places
 * the body in the host's content track instead.
 *
 * Read the story by the vertical edges: the reference card's rows and the form card's fields
 * should share one left edge, and the trailing edge should likewise agree.
 */

const Contact = Schema.Struct({
  name: Schema.String.annotate({ title: 'Full name' }),
  email: Schema.String.annotate({ title: 'Email' }),
  role: Schema.optional(Schema.String.annotate({ title: 'Role' })),
});

const values = { name: 'Ada Lovelace', email: 'ada@example.com', role: 'Engineer' };

const ReferenceCard = () => (
  <Next.Card.Root>
    <Next.Card.Header>
      <Next.Block>
        <Next.Icon icon='ph--user--regular' />
      </Next.Block>
      <Next.Card.Title>Reference card</Next.Card.Title>
    </Next.Card.Header>
    <Next.Card.Body>
      <Next.Card.Row>
        <Next.Card.Text>A card row — the inset to match.</Next.Card.Text>
      </Next.Card.Row>
      <Next.Card.Row>
        <Next.Card.Text variant='description'>Second row, same track.</Next.Card.Text>
      </Next.Card.Row>
    </Next.Card.Body>
  </Next.Card.Root>
);

const FormCard = () => (
  <Next.Card.Root>
    <Next.Card.Header>
      <Next.Block>
        <Next.Icon icon='ph--pencil--regular' />
      </Next.Block>
      <Next.Card.Title>Form card</Next.Card.Title>
    </Next.Card.Header>
    <Next.Card.Body>
      <Form.Root schema={Contact} values={values}>
        <Form.Viewport>
          <Form.Content>
            <Form.Fields />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Next.Card.Body>
  </Next.Card.Root>
);

const DefaultStory = () => (
  <div className='flex flex-col gap-4 w-96'>
    <ReferenceCard />
    <FormCard />
  </div>
);

const meta = {
  title: 'ui/react-ui-form/Card',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
