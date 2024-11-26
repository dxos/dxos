//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { testData, testView, TestSchema, type TestType } from '@dxos/schema/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { type DeprecatedFormProps, DeprecatedForm } from './Form';
import translations from '../../translations';
import { TestLayout, TestPanel } from '../testing';

const DefaultStory = (props: DeprecatedFormProps) => (
  <TestLayout json={{ props }}>
    <TestPanel>
      <DeprecatedForm {...props} />
    </TestPanel>
  </TestLayout>
);

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-form/DeprecatedForm',
  component: DeprecatedForm,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<DeprecatedFormProps<TestType>>;

export const Default: Story = {
  args: {
    object: create(testData),
    view: create(testView),
    schema: TestSchema,
  },
};

export const Empty: Story = {
  args: {
    view: create(testView),
    schema: TestSchema,
  },
};

export const Readonly: Story = {
  args: {
    object: create(testData),
    view: create(testView),
    schema: TestSchema,
    readonly: true,
  },
};
