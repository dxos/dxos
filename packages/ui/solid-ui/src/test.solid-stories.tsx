//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from 'storybook-solidjs-vite';

// TODO(burdon): https://ark-ui.com

const Test = () => {
  return <div>Test</div>;
};

const meta = {
  title: 'ui/solid-ui/test',
  component: Test,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof meta>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
