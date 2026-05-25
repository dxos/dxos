//
// Copyright 2026 DXOS.org
//

import { xml } from '@codemirror/lang-xml';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Format, Type } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Tooltip, useThemeContext } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { translations } from '#translations';

import { TestLayout, TestPanel } from '../../testing';
import { Form, type FormRootProps, omitId } from '../Form';
import { FormLayoutAnnotation } from './annotation';
import { parseLayout } from './parser';

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

/** Compact variant — single column, only the headline fields. */
const FLIGHT_LAYOUT_COMPACT = trim`
  <grid cols="1">
    <field name="airline"/>
    <field name="flightNumber"/>
    <field name="departAt"/>
  </grid>
`;

/**
 * Same schema annotated with two named layouts. `Form.Layout name="…"`
 * (or `Form.FieldSet layoutName="…"`) picks the variant; without a name
 * the `'default'` entry is used.
 */
const AnnotatedFlight = Flight.annotations({}).pipe(
  FormLayoutAnnotation.set({ default: FLIGHT_LAYOUT, compact: FLIGHT_LAYOUT_COMPACT }),
);

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

/**
 * Same annotated schema, but the story switches between the two named
 * layouts (`default` and `compact`) via a radio above the form.
 */
const NamedAnnotationStory = () => {
  const schema = useMemo(() => omitId(AnnotatedFlight) as unknown as Schema.Schema<any>, []);
  const [layoutName, setLayoutName] = useState<'default' | 'compact'>('default');
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
      <TestLayout json={{ layoutName, values }}>
        <div className='flex flex-col gap-2'>
          <div className='flex gap-2 text-sm'>
            {(['default', 'compact'] as const).map((name) => (
              <label key={name} className='flex items-center gap-1'>
                <input
                  type='radio'
                  name='layout'
                  checked={layoutName === name}
                  onChange={() => setLayoutName(name)}
                />
                {name}
              </label>
            ))}
          </div>
          <Form.Root schema={schema} defaultValues={values} onSave={handleSave} autoSave>
            <Form.Viewport>
              <Form.Content>
                <Form.FieldSet layoutName={layoutName} />
              </Form.Content>
            </Form.Viewport>
          </Form.Root>
        </div>
      </TestLayout>
    </Tooltip.Provider>
  );
};

export const NamedAnnotation: Story = {
  render: () => <NamedAnnotationStory />,
};

/**
 * Live playground: the layout template lives in a code editor on the right.
 * The form on the left re-renders as you type. If the template fails to
 * parse, the previous valid layout stays on screen and an error banner
 * surfaces under the editor.
 */
const PlaygroundStory = () => {
  const schema = useMemo(() => omitId(Flight) as unknown as Schema.Schema<any>, []);
  const [template, setTemplate] = useState(FLIGHT_LAYOUT);
  const [lastValid, setLastValid] = useState(FLIGHT_LAYOUT);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    try {
      parseLayout(template);
      setLastValid(template);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [template]);

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

  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      xml(),
      createBasicExtensions({ placeholder: 'Edit layout DSL…' }),
      createThemeExtensions({ themeMode, syntaxHighlighting: true }),
    ],
    [themeMode],
  );

  return (
    <Tooltip.Provider>
      <div className='dx-container grid grid-cols-[1fr_1fr] grid-rows-1 p-4 gap-4 overflow-hidden'>
        <TestPanel>
          <div className='overflow-auto h-full'>
            <Form.Root schema={schema} defaultValues={values} onSave={handleSave} autoSave>
              <Form.Viewport>
                <Form.Content>
                  <Form.Layout schema={schema} template={lastValid} />
                </Form.Content>
              </Form.Viewport>
            </Form.Root>
          </div>
        </TestPanel>
        <div className='grid grid-rows-3 gap-4 overflow-hidden'>
          <TestPanel>
            <div className='flex flex-col h-full overflow-hidden'>
              <Editor.Root>
                <Editor.View
                  classNames='flex-1 overflow-auto font-mono text-sm p-2'
                  extensions={extensions}
                  value={template}
                  onChange={setTemplate}
                />
              </Editor.Root>
              {error && <div className='border-t border-separator p-2 text-sm text-error-text font-mono'>{error}</div>}
            </div>
          </TestPanel>
          <TestPanel>
            <Syntax.Root data={schema.ast}>
              <Syntax.Content>
                <Syntax.Filter />
                <Syntax.Viewport>
                  <Syntax.Code testId='schema' classNames='text-xs' />
                </Syntax.Viewport>
              </Syntax.Content>
            </Syntax.Root>
          </TestPanel>
          <TestPanel>
            <Syntax.Root data={values}>
              <Syntax.Content>
                <Syntax.Filter />
                <Syntax.Viewport>
                  <Syntax.Code testId='data' classNames='text-xs' />
                </Syntax.Viewport>
              </Syntax.Content>
            </Syntax.Root>
          </TestPanel>
        </div>
      </div>
    </Tooltip.Provider>
  );
};

export const Playground: Story = {
  render: () => <PlaygroundStory />,
};
