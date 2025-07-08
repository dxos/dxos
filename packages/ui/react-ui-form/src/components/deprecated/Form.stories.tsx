//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { live } from '@dxos/live-object';
import { testData, TestSchema, testProjection, type TestType } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { DeprecatedForm, type DeprecatedFormProps } from './Form';
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
    object: live(testData),
    projection: live(testProjection),
    schema: TestSchema,
  },
};

export const Empty: Story = {
  args: {
    projection: live(testProjection),
    schema: TestSchema,
  },
};

export const Readonly: Story = {
  args: {
    object: live(testData),
    projection: live(testProjection),
    schema: TestSchema,
    readonly: true,
  },
};
