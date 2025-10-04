//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { DataType } from '@dxos/schema';
import { withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { QueryEditor, type QueryEditorProps } from './QueryEditor';

const meta = {
  title: 'ui/react-ui-components/QueryEditor',
  component: QueryEditor,
  render: (args: QueryEditorProps) => {
    const [space] = useSpaces();
    return <QueryEditor {...args} space={space} />;
  },
  decorators: [
    withClientProvider({
      types: [DataType.Organization, DataType.Person, DataType.Project, DataType.Employer],
      createIdentity: true,
    }),
    withTheme,
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

const classNames = 'is-[50rem] p-2 border border-subduedSeparator rounded-sm';

export const Default: Story = {
  args: {
    classNames,
    value: '(type:dxos.org/type/Person OR type:dxos.org/type/Organization) AND { title:"DXOS", value:100 } AND #foo',
  },
};

export const Tags: Story = {
  args: {
    classNames,
    value: '#foo #bar',
  },
};

export const Empty: Story = {
  args: {
    classNames,
  },
};
