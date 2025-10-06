//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { DataType } from '@dxos/schema';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { QueryEditor, type QueryEditorProps } from './QueryEditor';

const meta = {
  title: 'ui/react-ui-components/QueryEditor',
  component: QueryEditor,
  render: (args: QueryEditorProps) => {
    const [space] = useSpaces();
    return (
      <QueryEditor classNames='is-[40rem] p-2 border border-subduedSeparator rounded-sm' {...args} space={space} />
    );
  },
  decorators: [
    withTheme,
    withClientProvider({
      types: [DataType.Organization, DataType.Person, DataType.Project, DataType.Employer],
      createIdentity: true,
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Complex: Story = {
  args: {
    value: '#important OR type:dxos.org/type/Person AND { title:"DXOS", value: true }',
  },
};

export const Relation: Story = {
  args: {
    value: '(type:dxos.org/type/Person -> type:dxos.org/type/Organization)',
  },
};

export const Tags: Story = {
  args: {
    value: 'type:dxos.org/type/Person #investor #new',
  },
};
