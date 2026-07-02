//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { Capabilities } from '../common';
import { Capability } from '../core';
import { Surface } from '../ui';
import { withPluginManager } from './withPluginManager';

const MainRole = Surface.makeType<Record<string, never>>('org.dxos.test.role.main');

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
        Capability.contributes(
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
