//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { QueryEditor } from './QueryEditor';

const meta = {
  title: 'ui/react-ui-components/QueryEditor',
  component: QueryEditor,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true }),
    withTheme,
    withLayout({ fullscreen: true, classNames: 'justify-center' }),
  ],
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof QueryEditor>;

export const Default: Story = {
  render: () => {
    const { space } = useClientProvider();
    return <QueryEditor space={space} />;
  },
};
