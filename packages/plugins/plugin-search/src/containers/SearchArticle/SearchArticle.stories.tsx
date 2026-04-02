//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { SearchContextProvider } from '../../hooks';
import { translations } from '../../translations';

import { SearchArticle } from './SearchArticle';

const DefaultStory = () => (
  <SearchContextProvider>
    <SearchArticle />
  </SearchContextProvider>
);

const meta = {
  title: 'plugins/plugin-search/containers/SearchArticle',
  component: SearchArticle,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withAttention(),
    withMosaic(),
    withClientProvider({ createIdentity: true }),
    withPluginManager({
      plugins: [RuntimePlugin(), OperationPlugin(), ClientPlugin({})],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof SearchArticle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
