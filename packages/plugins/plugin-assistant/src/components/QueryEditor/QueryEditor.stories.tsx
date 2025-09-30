//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { QueryEditor } from './QueryEditor';

const meta = {
  title: 'plugins/plugin-assistant/QueryEditor',
  component: QueryEditor,
  decorators: [withTheme, withLayout({ classNames: 'w-[30rem]' })],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
