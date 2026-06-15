//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { TOOL_METADATA } from '@dxos/introspect-tools';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { ToolForm } from './ToolForm';

const meta: Meta<typeof ToolForm> = {
  title: 'ui/react-ui-introspect/ToolForm',
  component: ToolForm,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'p-2 max-w-md' })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof ToolForm>;

const PLUGIN_IDS = [
  'org.dxos.plugin.assistant',
  'org.dxos.plugin.markdown',
  'org.dxos.plugin.code',
  'org.dxos.plugin.chess',
  'org.dxos.plugin.sheet',
];

const PACKAGE_NAMES = ['@dxos/echo', '@dxos/react-ui', '@dxos/plugin-markdown', '@dxos/plugin-chess'];

// `list_surfaces` has a single optional plugin-id field — the Combobox
// should appear; clicking it opens a list of the IDs above.
export const PluginPicker: Story = {
  args: {
    tool: TOOL_METADATA.list_surfaces,
    pickerOptions: { 'plugin-id': PLUGIN_IDS },
  },
};

// `get_package` has a required package-name field.
export const PackagePicker: Story = {
  args: {
    tool: TOOL_METADATA.get_package,
    pickerOptions: { 'package-name': PACKAGE_NAMES },
  },
};

// Without `pickerOptions`, picker fields fall back to plain text inputs.
export const NoPickerOptions: Story = {
  args: {
    tool: TOOL_METADATA.get_package,
  },
};

// `list_plugins.id` is a substring search filter, not a known-id selector
// — it intentionally has no picker annotation, so even with options
// available the field renders as a text input.
export const ListPluginsHasNoPicker: Story = {
  args: {
    tool: TOOL_METADATA.list_plugins,
    pickerOptions: { 'plugin-id': PLUGIN_IDS },
  },
};
