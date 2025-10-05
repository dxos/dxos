//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Capabilities, createSurface } from '../common';
import { contributes } from '../core';
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
    withPluginManager({
      capabilities: [
        contributes(
          Capabilities.ReactSurface,
          createSurface({
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
