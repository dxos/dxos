//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ${name}, type ${name}RootProps } from './${name}';

const DefaultStory = (props: ${name}RootProps) => {
  return <${name}.Root {...props} />;
};

const meta = {
  title: 'ui/react-ui-xxx/${name}',
  component: ${name}.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
