//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { S } from '@dxos/echo-schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { FormInput, type FormInputProps } from './FormInput';
import translations from '../../translations';
import { TestLayout, TestPanel } from '../testing';

const TestSchema = S.Struct({
  name: S.String,
}).pipe(S.mutable);

type TestType = S.Schema.Type<typeof TestSchema>;

// TODO(burdon): Make reactive?
const obj: TestType = {
  name: 'DXOS',
};

const DefaultStory = (props: FormInputProps<TestType>) => {
  return (
    <TestLayout json={{ props, schema: TestSchema.ast.toJSON() }}>
      <TestPanel classNames='p-2'>
        <FormInput<TestType> {...props} />
      </TestPanel>
    </TestLayout>
  );
};

type StoryProps = FormInputProps<TestType>;

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-data/FormInput',
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    property: 'name',
    type: 'string',
    label: 'Name',
    getValue: <V,>(property: keyof TestType) => obj[property] as V,
    onValueChange: <V,>(property: keyof TestType, value: V) => (obj[property] = value as string),
  },
};
