//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { Tooltip } from '@dxos/react-ui';
import { withLayoutVariants, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { TestLayout, TestPanel } from '../testing';

import { NewForm, type NewFormRootProps } from './NewForm';

// TODO(burdon): Use @dxos/types.

const PersonSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  // active: Schema.optional(Schema.Boolean.annotations({ title: 'Active' })),
  // rank: Schema.optional(Schema.Number.annotations({ title: 'Rank' })),
  // website: Schema.optional(Format.URL.annotations({ title: 'Website' })),
  // address: Schema.optional(AddressSchema),
}).pipe(Schema.mutable);

type StoryProps<T extends AnyProperties> = {
  debug?: boolean;
  schema: Schema.Schema.AnyNoContext;
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

  return (
    <Tooltip.Provider>
      <TestLayout json={{ values, schema: schema.ast }}>
        <TestPanel>
          <NewForm.Root schema={schema} values={values} onSave={handleSave} />
        </TestPanel>
      </TestLayout>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-form/NewForm',
  component: NewForm.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayoutVariants()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryProps<any>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    schema: PersonSchema,
  },
};
