//
// Copyright 2026 DXOS.org
//

import '@fontsource/poiret-one';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Config } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Dialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { AboutDialog } from './AboutDialog';

type ConfigInput = {
  build?: { version?: string; timestamp?: string; commitHash?: string };
  env?: { DX_ENVIRONMENT?: string };
  edgeUrl?: string;
};

const makeConfig = ({ build, env, edgeUrl }: ConfigInput = {}) =>
  new Config({
    version: 1,
    runtime: {
      app: {
        build,
        env,
      },
      services: edgeUrl ? { edge: { url: edgeUrl } } : undefined,
    },
  });

const FIXED_TIMESTAMP = '2026-05-19T20:34:24.000Z';

const DefaultStory = () => (
  <Dialog.Root defaultOpen>
    <Dialog.Overlay>
      <AboutDialog />
    </Dialog.Overlay>
  </Dialog.Root>
);

const meta = {
  title: 'apps/composer-app/AboutDialog',
  component: AboutDialog,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof AboutDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    withClientProvider({
      config: makeConfig({
        build: {
          version: '0.8.3-beta.b78990fdd5',
          timestamp: FIXED_TIMESTAMP,
          commitHash: 'b78990fdd5',
        },
        env: { DX_ENVIRONMENT: 'development' },
      }),
    }),
  ],
};

export const Production: Story = {
  decorators: [
    withClientProvider({
      config: makeConfig({
        build: {
          version: '0.8.3',
          timestamp: FIXED_TIMESTAMP,
          commitHash: 'b78990fdd5',
        },
        env: { DX_ENVIRONMENT: 'production' },
      }),
    }),
  ],
};

export const WithEdgeEnvironment: Story = {
  decorators: [
    withClientProvider({
      config: makeConfig({
        build: {
          version: '0.8.3-beta.b78990fdd5',
          timestamp: FIXED_TIMESTAMP,
          commitHash: 'b78990fdd5',
        },
        env: { DX_ENVIRONMENT: 'development' },
        edgeUrl: 'https://edge-dev.dxos.workers.dev',
      }),
    }),
  ],
};

export const NoBuildInfo: Story = {
  decorators: [withClientProvider({ config: makeConfig() })],
};
