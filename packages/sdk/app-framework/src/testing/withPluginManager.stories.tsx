//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { withTheme, type Meta } from '@dxos/storybook-utils';

import { withPluginManager } from './withPluginManager';
import { Capabilities, createSurface } from '../common';
import { contributes } from '../core';
import { Surface } from '../react';

const DefaultStory = () => {
  console.log('Render');
  return (
    <div>
      <div>Hello</div>
      <Surface role='main' />
    </div>
  );
};

const meta: Meta = {
  title: 'sdk/app-framework/withPluginManager',
  render: DefaultStory,
  decorators: [
    withTheme,
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
};

export default meta;

export const Default = {};
