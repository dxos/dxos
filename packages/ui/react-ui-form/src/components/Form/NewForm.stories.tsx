//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { Filter, Format, Obj, Type } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Tooltip } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { TestLayout } from '../testing';

import { NewForm, type NewFormRootProps } from './NewForm';

const Organization = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)).annotations({ title: 'Full name' }),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Organization', // TODO(burdon): Change all types to /schema
    version: '0.1.0',
  }),
);

export interface Organization extends Schema.Schema.Type<typeof Organization> {}

const Person = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)).annotations({ title: 'Full name' }),
  active: Schema.optional(Schema.Boolean.annotations({ title: 'Active' })),
  // TODO(burdon): Custom field.
  address: Schema.optional(
    Schema.Struct({
      street: Schema.String,
      city: Schema.String,
      // TODO(burdon): Constrain input.
      state: Schema.String.pipe(Schema.minLength(2), Schema.maxLength(2)).annotations({ title: 'State' }),
      // TODO(burdon): Select input.
      zip: Schema.Number,
    }).annotations({ title: 'Address' }),
  ),
  // TODO(burdon): Array of refs.
  employer: Schema.optional(Type.Ref(Organization).annotations({ title: 'Employer' })),
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
} & NewFormRootProps<T>;

const DefaultStory = <T extends AnyProperties = AnyProperties>({
  debug,
  schema,
  values: valuesParam,
  ...props
}: StoryProps<T>) => {
  const [values, setValues] = useState<Partial<T>>(valuesParam ?? {});
  const client = useClient();
  const space = client.spaces.default;

  const handleSave = useCallback<NonNullable<NewFormRootProps<T>['onSave']>>((values) => {
    log.info('save', { values, meta });
    setValues(values);
  }, []);

  const handleCancel = useCallback<NonNullable<NewFormRootProps<T>['onCancel']>>(() => {
    log.info('cancel');
    setValues(valuesParam ?? {});
  }, []);

  const handleQueryRefOptions = useCallback<NonNullable<NewFormRootProps<T>['onQueryRefOptions']>>(
    async ({ typename }) => {
      log.info('query', { typename });
      const { objects } = await space.db.query(Filter.typename(typename)).run();
      return objects.map((result: any) => ({ dxn: Obj.getDXN(result), label: Obj.getLabel(result) }));
    },
    [space],
  );

  return (
    <Tooltip.Provider>
      <TestLayout json={{ values, schema: schema.ast }}>
        <NewForm.Root
          debug={debug}
          schema={schema}
          values={values}
          onAutoSave={handleSave}
          onSave={handleSave}
          onCancel={handleCancel}
          onQueryRefOptions={handleQueryRefOptions}
          {...props}
        >
          <NewForm.Viewport>
            <NewForm.Content>
              <NewForm.FieldSet />
              <NewForm.Actions />
            </NewForm.Content>
          </NewForm.Viewport>
        </NewForm.Root>
      </TestLayout>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-form/NewForm',
  component: NewForm.Root,
  render: DefaultStory,

  decorators: [
    withTheme,
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Organization, Person],
      onCreateIdentity: ({ client }) => {
        const space = client.spaces.default;
        [
          Obj.make(Organization, { name: 'DXOS' }),
          Obj.make(Organization, { name: 'BlueYard' }),
          Obj.make(Organization, { name: 'Backed' }),
          Obj.make(Organization, { name: 'BCV' }),
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

// TODO(burdon): Fix: Story<Person>
//  error TS2322: Type 'obj<Struct<{ name: optional<SchemaClass<string, string, never>>;
//  is not assignable to type 'Schema<Person, Person, never> & Schema<Person, any, never>'.
// type Story<T extends Type.Obj.Any> = StoryObj<StoryProps<T>>;
type Story<T extends AnyProperties> = StoryObj<StoryProps<T>>;

const schema = Person.pipe(Schema.omit('id'));

const values: Partial<Person> = {
  name: 'Alice',
};

export const Default: Story<any> = {
  args: {
    schema,
    values,
    autoSave: true,
  },
};

export const Readonly: Story<any> = {
  args: {
    schema,
    values,
    readonly: 'disabled',
  },
};

export const Static: Story<any> = {
  args: {
    schema,
    values,
    readonly: 'static',
  },
};

export const Empty: Story<any> = {
  render: () => (
    <NewForm.Root>
      <NewForm.Viewport>
        <NewForm.Content>
          <NewForm.FieldSet />
          <NewForm.Actions />
        </NewForm.Content>
      </NewForm.Viewport>
    </NewForm.Root>
  ),
};
