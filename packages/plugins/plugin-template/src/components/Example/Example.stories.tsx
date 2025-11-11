//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Example, type ExampleRootProps } from './Example';

const DefaultStory = (props: ExampleRootProps) => {
  return <Example.Root {...props} />;
};

const meta = {
  title: 'ui/react-ui-core/Example',
  component: Example.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ container: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
