//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ToolsExplorer } from './ToolsExplorer.tsx';

// Local introspect-mcp dev server (`moon run introspect-mcp:serve`).
const LOCAL_INTROSPECT_MCP_URL = 'http://localhost:39476/mcp';

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
    serverUrl: LOCAL_INTROSPECT_MCP_URL,
  },
};
