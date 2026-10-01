//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Annotation, Format } from '@dxos/echo';
import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Form } from './Form.tsx';

const FLIGHT_LAYOUT = trim`
  <grid cols="2">
    <field name="airline"/>
    <field name="flightNumber"/>
    <field name="origin"/>
    <field name="destination"/>
    <field name="cabin" span="2"/>
    <field name="notes" span="2"/>
  </grid>
`;

const FLIGHT_LAYOUT_COMPACT = trim`
  <grid cols="1">
    <field name="airline"/>
    <field name="flightNumber"/>
  </grid>
`;

const Flight = Schema.Struct({
  airline: Schema.optional(Schema.String.annotate({ title: 'Airline' })),
  flightNumber: Schema.optional(Schema.String.annotate({ title: 'Flight #' })),
  origin: Schema.optional(Schema.String.annotate({ title: 'From' })),
  destination: Schema.optional(Schema.String.annotate({ title: 'To' })),
  cabin: Schema.optional(Schema.Literals(['economy', 'premium', 'business', 'first']).annotate({ title: 'Cabin' })),
  notes: Schema.optional(Format.Text.annotate({ title: 'Notes' })),
}).pipe(Annotation.FormLayoutAnnotation.set({ default: FLIGHT_LAYOUT, compact: FLIGHT_LAYOUT_COMPACT }));

type Values = Schema.Schema.Type<typeof Flight>;

type StoryArgs = PaneArgs & { layoutName?: string };

const DefaultStory = ({ layoutName }: StoryArgs) => {
  const [values, setValues] = useState<Values>({ airline: 'Air France', flightNumber: 'AF-1', cabin: 'economy' });
  return (
    <Next.Panel.Root>
      <Next.Panel.Body>
        <Form.Root
          schema={Flight}
          values={values}
          onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
        >
          <Form.Content>
            <Form.Fields layoutName={layoutName} />
          </Form.Content>
        </Form.Root>
      </Next.Panel.Body>
      <Next.Panel.Footer>
        <Next.Typography truncate data-testid='values'>
          {JSON.stringify(values)}
        </Next.Typography>
      </Next.Panel.Footer>
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/next/FormLayout',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ height: '40rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = { args: { layoutName: 'compact' } };

const box = (canvas: ReturnType<typeof within>, name: string, role = 'textbox') =>
  canvas.getByRole(role, { name }).getBoundingClientRect();

/** 1. Test: the schema's layout annotation lays the fields out in a two-column grid with spans. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 2. Paired fields share a row, each taking half the grid; the Root still edits their values.
    const airline = box(canvas, 'Airline');
    const flight = box(canvas, 'Flight #');
    await expect(flight.top).toBeCloseTo(airline.top, 0);
    await expect(flight.left).toBeGreaterThan(airline.right);
    await expect(flight.width).toBeCloseTo(airline.width, 0);
    const origin = box(canvas, 'From');
    await expect(origin.top).toBeGreaterThan(airline.bottom);
    await expect(origin.left).toBeCloseTo(airline.left, 0);

    // 3. A `span="2"` cell runs from the first column's start to the second's end.
    const cabin = box(canvas, 'Cabin', 'combobox');
    await expect(cabin.left).toBeCloseTo(airline.left, 0);
    await expect(cabin.right).toBeCloseTo(flight.right, 0);
    const notes = box(canvas, 'Notes');
    await expect(notes.left).toBeCloseTo(airline.left, 0);
    await expect(notes.right).toBeCloseTo(flight.right, 0);

    await userEvent.type(canvas.getByRole('textbox', { name: 'From' }), 'JFK');
    await waitFor(() => expect(JSON.parse(canvas.getByTestId('values').textContent ?? '{}').origin).toBe('JFK'));
  },
};

/** 1. TestCompact: a named layout renders only the fields its template names, one per row. */
export const TestCompact: Story = {
  args: { layoutName: 'compact' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const airline = box(canvas, 'Airline');
    const flight = box(canvas, 'Flight #');
    await expect(flight.top).toBeGreaterThan(airline.bottom);
    await expect(flight.width).toBeCloseTo(airline.width, 0);
    await expect(canvas.queryByRole('textbox', { name: 'From' })).toBeNull();
  },
};
