//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import * as Common from '../common';
import { Capability } from '../core';
import { Surface } from '../react';

import { withPluginManager } from './withPluginManager';

const DefaultStory = () => {
  console.log('Render');
  return (
    <div>
      <div>Hello</div>
      <Surface role='main' />
    </div>
  );
};

const meta = {
  title: 'sdk/app-framework/withPluginManager',
  render: DefaultStory,
  decorators: [
    withTheme,
    withPluginManager({
      capabilities: [
        Capability.contributes(
          Common.Capability.ReactSurface,
          Common.createSurface({
            id: 'test',
            role: 'main',
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
