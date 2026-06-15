//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { DEFAULT_INTROSPECT_MCP_URL, ToolsExplorer } from './ToolsExplorer';

const meta: Meta<typeof ToolsExplorer> = {
  title: 'ui/react-ui-introspect/ToolsExplorer',
  component: ToolsExplorer,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof ToolsExplorer>;

export const Default: Story = {
  args: {
    serverUrl: DEFAULT_INTROSPECT_MCP_URL,
  },
};
