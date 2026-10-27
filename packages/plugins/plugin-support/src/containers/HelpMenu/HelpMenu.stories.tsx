//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/reactivity/Atom';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as AppUpdate from '@dxos/app-toolkit/AppUpdate';
import * as StatusBar from '@dxos/plugin-status-bar/StatusBar';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { Config } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { HelpMenu } from './HelpMenu.tsx';

const DefaultStory = () => (
  <StatusBar.EndContent>
    <HelpMenu />
  </StatusBar.EndContent>
);

type ConfigInput = {
  build?: { version?: string; timestamp?: string; commitHash?: string };
  env?: { DX_ENVIRONMENT?: string };
};

const makeConfig = ({ build, env }: ConfigInput = {}) =>
  new Config({
    version: 1,
    runtime: {
      app: {
        build,
        env,
      },
    },
  });

const FIXED_TIMESTAMP = '2026-05-19T20:34:24.000Z';

/** A platform update manager pinned to one status; actions resolve without changing it. */
const makeUpdateManager = (initial: AppUpdate.Status) =>
  Capability.contribute(AppCapabilities.UpdateManager, {
    status: Atom.make<AppUpdate.Status>(initial).pipe(Atom.keepAlive),
    check: async () => {},
    install: async () => {},
    apply: async () => {},
  });

const withUpdates = (initial?: AppUpdate.Status) =>
  withPluginManager({
    plugins: CorePlugins.make(),
    capabilities: initial ? [makeUpdateManager(initial)] : [],
  });

const productionConfig = withClientProvider({
  config: makeConfig({
    build: { version: '0.11.9-preview.7', timestamp: FIXED_TIMESTAMP, commitHash: 'b78990fdd5' },
    env: { DX_ENVIRONMENT: 'production' },
  }),
});

const meta = {
  title: 'plugins/plugin-support/containers/HelpMenu',
  component: HelpMenu,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof HelpMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    withUpdates(),
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
    withUpdates(),
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

export const NoBuildInfo: Story = {
  decorators: [withUpdates(), withClientProvider({ config: makeConfig() })],
};

export const CheckForUpdates: Story = {
  decorators: [withUpdates({ kind: 'idle' }), productionConfig],
};

export const UpToDate: Story = {
  decorators: [withUpdates({ kind: 'up-to-date', checkedAt: Date.parse(FIXED_TIMESTAMP) }), productionConfig],
};

export const UpdateAvailable: Story = {
  decorators: [withUpdates({ kind: 'available', version: '0.11.9-preview.8' }), productionConfig],
};

export const Downloading: Story = {
  decorators: [
    withUpdates({ kind: 'downloading', progress: { completed: 42, total: 100, unit: 'bytes' } }),
    productionConfig,
  ],
};

export const ReadyToRestart: Story = {
  decorators: [withUpdates({ kind: 'ready' }), productionConfig],
};
