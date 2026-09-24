//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { ThrowError } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { Capabilities } from '../common/index.ts';
import * as Role from '../common/Role.ts';
import { Capability } from '../core/index.ts';
import { Surface } from '../ui/index.ts';
import { withPluginManager } from './withPluginManager.tsx';

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
        Capability.contribute(
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
  render: () => <ThrowError delay={0} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Download logs' })).toBeInTheDocument());
    // Clear the smoke-test flag only once the intended fallback has been asserted.
    (window as any).__ERROR_BOUNDARY_ERRORS__ = [];
  },
};
