//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React from 'react';

import { Card, Icon } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Form } from './Form';

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
  name: Schema.String.annotations({ title: 'Full name' }),
  email: Schema.String.annotations({ title: 'Email' }),
  role: Schema.optional(Schema.String.annotations({ title: 'Role' })),
});

const values = { name: 'Ada Lovelace', email: 'ada@example.com', role: 'Engineer' };

const ReferenceCard = () => (
  <Card.Root fullWidth>
    <Card.Header>
      <Card.Block>
        <Icon icon='ph--user--regular' />
      </Card.Block>
      <Card.Title>Reference card</Card.Title>
    </Card.Header>
    <Card.Body>
      <Card.Row>
        <Card.Text>A card row — the inset to match.</Card.Text>
      </Card.Row>
      <Card.Row>
        <Card.Text variant='description'>Second row, same track.</Card.Text>
      </Card.Row>
    </Card.Body>
  </Card.Root>
);

const FormCard = () => (
  <Card.Root fullWidth>
    <Card.Header>
      <Card.Block>
        <Icon icon='ph--pencil--regular' />
      </Card.Block>
      <Card.Title>Form card</Card.Title>
    </Card.Header>
    <Card.Body>
      <Form.Root schema={Contact} values={values}>
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Card.Body>
  </Card.Root>
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
