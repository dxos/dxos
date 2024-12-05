//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { create } from '@dxos/live-object';
import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { testData, TestSchema, testView, type TestType } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import translations from '../../translations';
import { TestLayout, TestPanel } from '../testing';
import { DeprecatedForm, type DeprecatedFormProps } from './Form';

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
