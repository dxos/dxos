//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { QueryEditor } from './QueryEditor';

const meta = {
  title: 'plugins/plugin-assistant/QueryEditor',
  component: QueryEditor,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    classNames: 'is-[50rem] p-2 border border-subduedSeparator rounded-sm',
    query: '(type:dxos.org/type/Person OR type:dxos.org/type/Organization) AND { title:"DXOS", value:100 }',
  },
};

export const Empty: Story = {
  args: {
    classNames: 'is-[50rem] p-2 border border-subduedSeparator rounded-sm',
  },
};
