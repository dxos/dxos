//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { QueryBox } from './QueryBox';

const meta = {
  title: 'ui/react-ui-components/QueryBox',
  component: QueryBox,
  render: () => {
    const { space } = useClientProvider();
    return <QueryBox classNames='is-[40rem] p-2 border border-separator rounded-sm' space={space} />;
  },
  decorators: [withClientProvider({ createIdentity: true, createSpace: true }), withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof QueryBox>;

export default meta;

type Story = StoryObj<typeof QueryBox>;

export const Default: Story = {};
