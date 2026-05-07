//
// Copyright 2026 DXOS.org
//

// Storybook for `ToolsExplorer`. Spin up the introspect-mcp server in
// another terminal:
//
//   moon run introspect-mcp:serve-http
//
// then load this story. The default URL points at the configured server
// (`DEFAULT_INTROSPECT_MCP_URL`); override with the `serverUrl` arg in the
// Storybook controls panel.

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
