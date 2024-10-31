//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { FieldSchema } from '@dxos/schema';
import { TestSchema, type TestType, testView } from '@dxos/schema/testing';
import { withTheme } from '@dxos/storybook-utils';

import { Field, type FieldProps } from './Field';
import translations from '../../translations';
import { TestPopup } from '../testing';

const DefaultStory = (args: FieldProps<TestType>) => (
  <div>
    <TestPopup>
      <Field {...args} />
    </TestPopup>

    <SyntaxHighlighter classNames='absolute right-2 bottom-2 w-96 text-xs border border-separator rounded'>
      {JSON.stringify(args, null, 2)}
    </SyntaxHighlighter>
  </div>
);

export const Default: StoryObj<typeof Field<TestType>> = {
  args: {
    field: create(FieldSchema, testView.fields[0]),
    schema: TestSchema,
  },
};

const meta: Meta<typeof Field<TestType>> = {
  title: 'ui/react-ui-data/Field',
  component: Field,
  render: DefaultStory as any,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;
