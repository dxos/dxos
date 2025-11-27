//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { Format, Type } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { Tooltip } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { TestLayout } from '../testing';

import { NewForm, type NewFormRootProps } from './NewForm';

const Person = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Full name' })),
  active: Schema.optional(Schema.Boolean.annotations({ title: 'Active' })),
  age: Schema.optional(Schema.Number.annotations({ title: 'Age' })),
  location: Format.GeoPoint.annotations({ title: 'Location' }),
  identities: Schema.optional(Schema.Array(Schema.String).annotations({ title: 'Identities' })),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Person', // TODO(burdon): /schema
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
  const handleSave = useCallback<NonNullable<NewFormRootProps<T>['onSave']>>((values) => {
    setValues(values);
  }, []);
  const handleCancel = useCallback<NonNullable<NewFormRootProps<T>['onCancel']>>(() => {
    setValues(valuesParam ?? {});
  }, []);

  return (
    <Tooltip.Provider>
      <TestLayout json={{ values, schema: schema.ast }}>
        <NewForm.Root
          debug={debug}
          schema={schema}
          values={values}
          onSave={handleSave}
          onCancel={handleCancel}
          {...props}
        >
          <NewForm.Content>
            <NewForm.FieldSet />
            <NewForm.Actions />
          </NewForm.Content>
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
    //, withLayoutVariants()
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryProps<any>>;

export default meta;

type Story<T extends Type.Obj.Any> = StoryObj<StoryProps<T>>;

// TODO(burdon): Fix.
// export const Default: Story<Person> = {
export const Default: Story<any> = {
  args: {
    schema: Person,
    values: {
      name: 'Alice',
    },
    onCancel: () => {},
  },
};

export const Readonly: Story<any> = {
  args: {
    schema: Person,
    readonly: 'disabled',
    values: {
      name: 'Alice',
    },
  },
};

export const Static: Story<any> = {
  args: {
    schema: Person,
    readonly: 'static',
    values: {
      name: 'Alice',
    },
  },
};
