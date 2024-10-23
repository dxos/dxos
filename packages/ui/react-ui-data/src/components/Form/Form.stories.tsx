//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Form, type FormProps } from './Form';
import { testData, testView, TestSchema, type TestType } from '../../testing';
import translations from '../../translations';
import { TestPopup } from '../testing';

const Story = (props: FormProps) => (
  <TestPopup>
    <Form {...props} />
  </TestPopup>
);

export const Default: StoryObj<FormProps<TestType>> = {
  args: {
    data: create(testData),
    view: create(testView),
    schema: TestSchema,
  },
};

export const Empty: StoryObj<FormProps<TestType>> = {
  args: {
    view: create(testView),
    schema: TestSchema,
  },
};

export const Readonly: StoryObj<FormProps<TestType>> = {
  args: {
    data: create(testData),
    view: create(testView),
    schema: TestSchema,
    readonly: true,
  },
};

const meta: Meta<typeof Story> = {
  title: 'react-ui-data/Form',
  component: Form,
  render: Story,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;
