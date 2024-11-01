//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { testData, testView, TestSchema, type TestType } from '@dxos/schema/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Form, type FormProps } from './Form';
import translations from '../../translations';
import { TestPopup } from '../testing';

const DefaultStory = (props: FormProps) => (
  <TestPopup>
    <Form {...props} />
  </TestPopup>
);

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-data/Form',
  component: Form,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

type Story = StoryObj<FormProps<TestType>>;

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
