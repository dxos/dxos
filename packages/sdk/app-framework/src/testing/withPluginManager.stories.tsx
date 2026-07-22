//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { ThrowError } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { Capabilities } from '../common';
import * as Role from '../common/Role';
import { Capability } from '../core';
import { Surface } from '../ui';
import { withPluginManager } from './withPluginManager';

const MainRole = Role.make<Record<string, never>>('org.dxos.test.role.main');

const DefaultStory = () => {
  console.log('Render');
  return (
    <div>
      <div>Hello</div>
      <Surface.Surface type={MainRole} />
    </div>
  );
};

const meta = {
  title: 'sdk/app-framework/testing/withPluginManager',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      capabilities: [
        Capability.provide(
          Capabilities.ReactSurface,
          Surface.create({
            id: 'test',
            filter: Surface.makeFilter(MainRole),
            component: ({ role }) => <span>{JSON.stringify({ role })}</span>,
          }),
        ),
      ],
    }),
  ],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Demonstrates `withPluginManager`'s default fallback (`StorybookErrorFallback`): when the app
 * throws, the theme-independent `ErrorFallback` renders with a "Download logs" button alongside
 * the usual "Copy" action.
 */
export const Crashes: Story = {
  render: () => <ThrowError />,
  play: async () => {
    // This story intentionally renders an ErrorBoundary fallback; clear the smoke-test error flag.
    (window as any).__ERROR_BOUNDARY_ERRORS__ = [];
  },
};
