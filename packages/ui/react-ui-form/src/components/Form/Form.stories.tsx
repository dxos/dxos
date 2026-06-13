//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { DXN, Annotation, Format, Obj, Ref, Tag, Type } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { log } from '@dxos/log';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Tooltip } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { TestLayout } from '../testing';
import { type ExcludeId, Form, type FormRootProps, omitId } from './Form';

const Organization = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)).annotations({ title: 'Full name' }),
}).pipe(Type.makeObject(DXN.make('com.example.type.organization', '0.1.0')));

export type Organization = Type.InstanceType<typeof Organization>;

const Person = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)).annotations({ title: 'Full name' }),
  ignore: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
  active: Schema.optional(Schema.Boolean.annotations({ title: 'Active' })),
  address: Schema.optional(
    Schema.Struct({
      street: Schema.String,
      city: Schema.String,
      // TODO(burdon): Constrain input control.
      state: Schema.String.pipe(Schema.minLength(2), Schema.maxLength(2)).annotations({
        title: 'State',
        description: 'State code',
      }),
      zip: Schema.Number.annotations({ title: 'ZIP Code' }),
    }).annotations({ title: 'Address' }),
  ),
  employer: Schema.optional(Ref.Ref(Organization).annotations({ title: 'Employer' })),
  tags: Schema.optional(Schema.Array(Ref.Ref(Tag.Tag)).annotations({ title: 'Tags' })),
  status: Schema.optional(Schema.Literal('active', 'inactive').annotations({ title: 'Status' })),
  notes: Schema.optional(Format.Text.annotations({ title: 'Notes' })),
  location: Schema.optional(Format.GeoPoint.annotations({ title: 'Location' })),
  birthday: Schema.optional(Format.DateOnly.annotations({ title: 'Birthday' })),
  meetingAt: Schema.optional(Format.DateTime.annotations({ title: 'Next meeting' })),
  reminderAt: Schema.optional(Format.TimeOnly.annotations({ title: 'Reminder time' })),
  tasks: Schema.optional(Schema.Array(Schema.String).annotations({ title: 'Tasks' })),
  locations: Schema.optional(Schema.Array(Format.GeoPoint).annotations({ title: 'Locations' })),
  identities: Schema.optional(
    Schema.Array(
      Schema.Struct({
        type: Schema.String.annotations({ title: 'Type' }),
        value: Schema.String.annotations({ title: 'Value' }),
      }).annotations({ title: 'Identities' }),
    ).annotations({
      title: 'Identities',
    }),
  ),
}).pipe(Type.makeObject(DXN.make('org.dxos.type.person', '0.1.0')));

export type Person = Type.InstanceType<typeof Person>;

type DefaultStoryProps<T extends AnyProperties> = {
  schema?: Schema.Schema<T>;
} & FormRootProps<T>;

const DefaultStory = <T extends AnyProperties = AnyProperties>({
  schema,
  values: valuesProp,
  ...props
}: DefaultStoryProps<T>) => {
  const [values, setValues] = useState<Partial<T>>(valuesProp ?? {});
  const spaces = useSpaces();
  const space = spaces[0];
  const handleSave = useCallback<NonNullable<FormRootProps<T>['onSave']>>((values) => {
    log.info('save', { values, meta });
    setValues(values);
  }, []);

  const handleCancel = useCallback<NonNullable<FormRootProps<T>['onCancel']>>(() => {
    log.info('cancel');
    setValues(valuesProp ?? {});
  }, []);

  if (!space) {
    return <Loading />;
  }

  return (
    <Tooltip.Provider>
      <TestLayout json={{ values, schema: schema?.ast }}>
        <Form.Root
          schema={schema}
          defaultValues={values}
          db={space.db}
          onSave={handleSave}
          onCancel={handleCancel}
          {...props}
        >
          <Form.Viewport scroll>
            <Form.Content>
              <Form.Section label='Section' description='This is a section' />
              <Form.FieldSet />
              <Form.Actions />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </TestLayout>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-form/Form',
  component: Form.Root,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Tag.Tag, Organization, Person],
      onCreateSpace: ({ space }) => {
        [
          ...Array.from({ length: 3 }).map((_, i) => Obj.make(Tag.Tag, { label: `Tag ${i}` })),
          ...Array.from({ length: 50 }).map((_, i) => Obj.make(Organization, { name: `Organization ${i}` })),
        ].map((obj) => space.db.add(obj));
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<DefaultStoryProps<any>>;

export default meta;

type Story<T extends AnyProperties> = StoryObj<DefaultStoryProps<T>>;

const PersonSchema = Type.getSchema(Person);

const values: Partial<Person> = {
  name: 'Alice',
  location: [40.7128, -74.006],
  tasks: ['task 1', 'task 2'],
  birthday: '1990-05-12',
  meetingAt: '2026-06-01T15:30:00.000Z',
  reminderAt: '09:00:00',
};

/**
 * Build a data-entry surface by handing an Effect schema to `Form.Root` — the form derives its fields,
 * types, validation, and selects from the schema, so you don't hand-wire one control per property.
 * Customize individual fields with `fieldMap` (keyed by JSON path), render discriminated unions
 * conditionally via the discriminator, and label ref-picker options by their parent object with
 * `ParentLabelAnnotation`.
 *
 * @idiom org.dxos.react-ui-form.schemaForm
 *   applies: Any data-entry section bound to an Effect schema — settings, object/article editors, create dialogs
 *   instead-of: Hand-wiring Input/Select/Switch controls per field in bespoke React
 *   uses: {@link Form.Root}, {@link Form.FieldSet}
 *   related: org.dxos.react-ui-menu.toolbarMenu
 */
export const Default: Story<ExcludeId<typeof PersonSchema>> = {
  args: {
    schema: omitId(PersonSchema),
    values,
    autoSave: true,
  },
};

export const Readonly: Story<ExcludeId<typeof PersonSchema>> = {
  args: {
    schema: omitId(PersonSchema),
    values,
    readonly: true,
  },
};

export const Static: Story<ExcludeId<typeof PersonSchema>> = {
  args: {
    schema: omitId(PersonSchema),
    values,
    layout: 'static',
  },
};

export const Empty: Story<ExcludeId<typeof PersonSchema>> = {
  args: {},
};
