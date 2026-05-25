//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { Format, Type } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Tooltip } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { translations } from '#translations';

import { TestLayout } from '../../testing';
import { Form, type FormRootProps, omitId } from '../Form';
import { FormLayoutAnnotation } from './annotation';

/**
 * Sample schema: a Flight booking carries airline, flight number, route, dates,
 * cabin class. Without an annotation `<Form.FieldSet/>` renders one field per
 * row (see the `Linear` story). The `FormLayoutAnnotation` on this schema
 * arranges the same fields in a 2-column grid with selective spans.
 */
const Flight = Schema.Struct({
  airline: Schema.optional(Schema.String.annotations({ title: 'Airline' })),
  flightNumber: Schema.optional(Schema.String.annotations({ title: 'Flight #' })),
  origin: Schema.optional(Schema.String.annotations({ title: 'From' })),
  destination: Schema.optional(Schema.String.annotations({ title: 'To' })),
  departAt: Schema.optional(Format.DateTime.annotations({ title: 'Depart' })),
  arriveAt: Schema.optional(Format.DateTime.annotations({ title: 'Arrive' })),
  cabin: Schema.optional(Schema.Literal('economy', 'premium', 'business', 'first').annotations({ title: 'Cabin' })),
  notes: Schema.optional(Format.Text.annotations({ title: 'Notes' })),
}).pipe(
  Type.object({
    typename: 'com.example.type.flight',
    version: '0.1.0',
  }),
);

export interface Flight extends Schema.Schema.Type<typeof Flight> {}

const FLIGHT_LAYOUT = trim`
  <grid cols="2">
    <field name="airline"/>
    <field name="flightNumber"/>
    <field name="origin"/>
    <field name="destination"/>
    <field name="departAt"/>
    <field name="arriveAt"/>
    <field name="cabin" span="2"/>
    <field name="notes" span="2"/>
  </grid>
`;

/** Same schema but annotated so `Form.FieldSet` auto-picks the grid layout. */
const AnnotatedFlight = Flight.annotations({}).pipe(FormLayoutAnnotation.set(FLIGHT_LAYOUT));

type FlightValues = Omit<Schema.Schema.Type<typeof Flight>, 'id'>;

type StoryProps = {
  schema: Schema.Schema<any>;
  template?: string;
};

const DefaultStory = ({ schema, template }: StoryProps) => {
  const [values, setValues] = useState<Partial<FlightValues>>({
    airline: 'United Airlines',
    flightNumber: 'UA123',
    origin: 'SFO',
    destination: 'LHR',
    departAt: '2026-06-01T15:30:00.000Z',
    arriveAt: '2026-06-02T09:30:00.000Z',
    cabin: 'economy',
  });

  const handleSave = useCallback<NonNullable<FormRootProps<any>['onSave']>>((next) => {
    setValues(next as Partial<FlightValues>);
  }, []);

  return (
    <Tooltip.Provider>
      <TestLayout json={{ values }}>
        <Form.Root schema={schema} defaultValues={values} onSave={handleSave} autoSave>
          <Form.Viewport>
            <Form.Content>
              {template !== undefined ? <Form.Layout schema={schema} template={template} /> : <Form.FieldSet />}
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </TestLayout>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-form/FormLayout',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ createIdentity: true, createSpace: true }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryProps>;

export default meta;

type Story = StoryObj<StoryProps>;

/** Baseline: no annotation, no override — `Form.FieldSet` renders linearly (one field per row). */
export const Linear: Story = {
  args: {
    schema: omitId(Flight),
  },
};

/** `Form.Layout` invoked directly with a `template` prop, bypassing any annotation. */
export const TemplateProp: Story = {
  args: {
    schema: omitId(Flight),
    template: FLIGHT_LAYOUT,
  },
};

/** Schema carries `FormLayoutAnnotation`; `Form.FieldSet` auto-detects and delegates. */
export const SchemaAnnotation: Story = {
  args: {
    schema: omitId(AnnotatedFlight),
  },
};
