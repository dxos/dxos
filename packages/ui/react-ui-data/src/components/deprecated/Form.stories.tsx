//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { testData, testView, TestSchema, type TestType } from '@dxos/schema/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { type DeprecatedFormProps, DeprecatedForm } from './Form';
import translations from '../../translations';
import { TestPopup } from '../testing';

const DefaultStory = (props: DeprecatedFormProps) => (
  <div className='w-full grid grid-cols-3'>
    <div className='flex col-span-2 w-full justify-center p-4'>
      <TestPopup>
        <DeprecatedForm {...props} />
      </TestPopup>
    </div>
    <SyntaxHighlighter className='w-full text-xs'>{JSON.stringify(props, null, 2)}</SyntaxHighlighter>
  </div>
);

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-data/DeprecatedForm',
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
