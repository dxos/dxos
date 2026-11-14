//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Annotation, Format } from '@dxos/echo';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withTheme } from '@dxos/react-ui/testing';
import * as Typography from '@dxos/react-ui/Typography';
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
    <Panel.Root>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Layout.Container>
              <Form.Root
                schema={Flight}
                values={values}
                onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
              >
                <Form.Content>
                  <Form.Fields layoutName={layoutName} />
                </Form.Content>
              </Form.Root>
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
      <Panel.Footer>
        <Typography.Text truncate data-testid='values'>
          {JSON.stringify(values)}
        </Typography.Text>
      </Panel.Footer>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/FormLayout',
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

const ROW_LAYOUT = trim`
  <grid cols="3" header="true">
    <field name="name"/>
    <field name="type"/>
    <field name="optional" width="auto"/>
  </grid>
`;

const Row = Schema.Struct({
  name: Schema.String.annotate({ title: 'Name' }),
  type: Schema.String.annotate({ title: 'Type' }),
  optional: Schema.optional(Schema.Boolean.annotate({ title: 'Optional' })),
}).pipe(Annotation.FormLayoutAnnotation.set({ default: ROW_LAYOUT }));

const Table = Schema.Struct({ fields: Schema.Array(Row).annotate({ title: 'Fields' }) });

const TableStory = ({ readonly }: { readonly?: boolean }) => {
  const [values, setValues] = useState<Schema.Schema.Type<typeof Table>>({
    fields: [
      { name: 'subject', type: 'string' },
      { name: 'folder', type: 'Folder', optional: true },
    ],
  });
  return (
    <Panel.Root>
      <Panel.Body asChild>
        <Layout.Container>
          <Form.Root
            schema={Table}
            values={values}
            readonly={readonly}
            onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
          >
            <Form.Content>
              <Form.Fields />
            </Form.Content>
          </Form.Root>
        </Layout.Container>
      </Panel.Body>
      <Panel.Footer>
        <Typography.Text truncate data-testid='values'>
          {JSON.stringify(values)}
        </Typography.Text>
      </Panel.Footer>
    </Panel.Root>
  );
};

/**
 * 1. TestTable: an array whose item struct lays out by a header grid is a table: the columns are named once, every row's
 * cells share the tracks, and a `width="auto"` column fits its switch.
 */
export const TestTable: StoryObj<{ readonly?: boolean }> = {
  render: TableStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 2. Each title shows once, above the rows, and the cells under it start where it does.
    await expect(canvas.getAllByText('Optional')).toHaveLength(1);
    const switches = canvas.getAllByRole('switch', { name: 'Optional' });
    await expect(switches).toHaveLength(2);
    const [first, second] = switches.map((input) => input.closest('.dx-switch')!.getBoundingClientRect());
    await expect(second.left).toBeCloseTo(first.left, 0);
    await expect(first.left).toBeGreaterThanOrEqual(canvas.getByText('Optional').getBoundingClientRect().left - 1);

    // 3. A switch in a row edits its own row.
    await userEvent.click(switches[0].closest('.dx-switch')!);
    await waitFor(() =>
      expect(JSON.parse(canvas.getByTestId('values').textContent ?? '{}').fields[0].optional).toBe(true),
    );
  },
};

/** 1. TestTableReadonly: read-only, a table's switches look as they do editable and take no press. */
export const TestTableReadonly: StoryObj<{ readonly?: boolean }> = {
  render: TableStory,
  args: { readonly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const root = canvas.getAllByRole('switch', { name: 'Optional' })[0].closest('.dx-switch')!;
    await expect(root).toHaveAttribute('data-readonly');
    await expect(root).not.toHaveAttribute('data-disabled');
    await userEvent.click(root);
    await expect(JSON.parse(canvas.getByTestId('values').textContent ?? '{}').fields[0].optional).toBeUndefined();
  },
};
