//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Field, type FieldProps } from './Field';
import translations from '../../translations';
import { TestPopup } from '../testing';

const DefaultStory = (props: FieldProps) => (
  <div className='w-full grid grid-cols-3'>
    <div className='flex col-span-2 w-full justify-center p-4'>
      <TestPopup>
        <Field {...props} />
      </TestPopup>
    </div>
    <SyntaxHighlighter className='w-full text-xs'>{JSON.stringify(props, null, 2)}</SyntaxHighlighter>
  </div>
);

const meta: Meta<typeof Field> = {
  title: 'ui/react-ui-data/Field',
  component: Field,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Field>;

export const Default: Story = {
  args: {
    field: { property: 'email', format: FormatEnum.Email },
  },
};
