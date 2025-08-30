//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { live } from '@dxos/live-object';
import { TestSchema, testData, testView } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';
import { TestLayout, TestPanel } from '../testing';

import { DeprecatedForm, type DeprecatedFormProps } from './Form';

const DefaultStory = (props: DeprecatedFormProps) => (
  <TestLayout json={{ props }}>
    <TestPanel>
      <DeprecatedForm {...props} />
    </TestPanel>
  </TestLayout>
);

const meta = {
  title: 'ui/react-ui-form/DeprecatedForm',
  component: DeprecatedForm,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DeprecatedForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    object: live(testData),
    projection: live(testView).projection,
    schema: TestSchema,
  },
};

export const Readonly: Story = {
  args: {
    object: live(testData),
    projection: live(testView).projection,
    schema: TestSchema,
    readonly: true,
  },
};
