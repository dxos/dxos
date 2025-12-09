//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { Annotation, Format, Obj, Tag, Type } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Tooltip } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { TestLayout } from '../testing';

import { type ExcludeId, Form, type FormRootProps, omitId } from './Form';

const Organization = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)).annotations({ title: 'Full name' }),
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Organization', // TODO(burdon): Change all types to /schema
    version: '0.1.0',
  }),
);

export interface Organization extends Schema.Schema.Type<typeof Organization> {}

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
      zip: Schema.Number,
    }).annotations({ title: 'Address' }),
  ),
  employer: Schema.optional(Type.Ref(Organization).annotations({ title: 'Employer' })),
  tags: Schema.optional(Schema.Array(Type.Ref(Tag.Tag)).annotations({ title: 'Tags' })),
  status: Schema.optional(Schema.Literal('active', 'inactive').annotations({ title: 'Status' })),
  notes: Schema.optional(Format.Text.annotations({ title: 'Notes' })),
  location: Schema.optional(Format.GeoPoint.annotations({ title: 'Location' })),
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
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Person', // TODO(burdon): Change all types to /schema
    version: '0.1.0',
  }),
);

export interface Person extends Schema.Schema.Type<typeof Person> {}

type StoryProps<T extends AnyProperties> = {
  debug?: boolean;
  schema: Schema.Schema<T>;
} & FormRootProps<T>;

const DefaultStory = <T extends AnyProperties = AnyProperties>({
  debug,
  schema,
  values: valuesParam,
  ...props
}: StoryProps<T>) => {
  const [values, setValues] = useState<Partial<T>>(valuesParam ?? {});
  const client = useClient();
  const space = client.spaces.default;

  const handleSave = useCallback<NonNullable<FormRootProps<T>['onSave']>>((values) => {
    log.info('save', { values, meta });
    setValues(values);
  }, []);

  const handleCancel = useCallback<NonNullable<FormRootProps<T>['onCancel']>>(() => {
    log.info('cancel');
    setValues(valuesParam ?? {});
  }, []);

  return (
    <Tooltip.Provider>
      <TestLayout json={{ values, schema: schema.ast }}>
        <Form.Root
          debug={debug}
          schema={schema}
          values={values}
          db={space.db}
          onSave={handleSave}
          onCancel={handleCancel}
          {...props}
        >
          <Form.Viewport>
            <Form.Content>
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
    withTheme,
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Tag.Tag, Organization, Person],
      onCreateIdentity: ({ client }) => {
        const space = client.spaces.default;
        [
          Obj.make(Organization, { name: 'DXOS' }),
          Obj.make(Organization, { name: 'BlueYard' }),
          Obj.make(Organization, { name: 'Backed' }),
          Obj.make(Organization, { name: 'BCV' }),
          Tag.make({ label: 'Tag 1' }),
          Tag.make({ label: 'Tag 2' }),
          Tag.make({ label: 'Tag 3' }),
        ].map((obj) => space.db.add(obj));
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryProps<any>>;

export default meta;

type Story<T extends AnyProperties> = StoryObj<StoryProps<T>>;

const values: Partial<Person> = {
  name: 'Alice',
  location: [40.7128, -74.006],
  tasks: ['task 1', 'task 2'],
};

export const Default: Story<ExcludeId<typeof Person>> = {
  args: {
    schema: omitId(Person),
    values,
    autoSave: true,
  },
};

export const Readonly: Story<ExcludeId<typeof Person>> = {
  args: {
    schema: omitId(Person),
    values,
    readonly: true,
  },
};

export const Static: Story<ExcludeId<typeof Person>> = {
  args: {
    schema: omitId(Person),
    values,
    layout: 'static',
  },
};

export const Empty: Story<ExcludeId<typeof Person>> = {
  render: () => (
    <TestLayout>
      <Form.Root>
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
            <Form.Actions />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </TestLayout>
  ),
};
