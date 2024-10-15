//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

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

export default {
  title: 'react-ui-data/Form',
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  parameters: {
    layout: 'centered',
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    data: create(testData),
    view: create(testView),
    schema: TestSchema,
  } satisfies FormProps<TestType>,
};

export const Empty = {
  args: {
    view: create(testView),
    schema: TestSchema,
  } satisfies FormProps<TestType>,
};

export const Readonly = {
  args: {
    data: create(testData),
    view: create(testView),
    schema: TestSchema,
    readonly: true,
  } satisfies FormProps<TestType>,
};
