//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { ${name} } from './${name}';

const meta: Meta<typeof ${name}> = {
  title: 'components/${name}',
  component: ${name},
  decorators: [withTheme],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
