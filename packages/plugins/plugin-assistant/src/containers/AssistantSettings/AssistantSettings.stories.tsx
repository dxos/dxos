//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Provider } from '@dxos/ai';
import { withPluginManager } from '@dxos/app-framework/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { AssistantSettings } from './AssistantSettings';

const meta = {
  title: 'plugins/plugin-assistant/containers/AssistantSettings',
  tags: ['settings'],
  component: AssistantSettings,
  // `AssistantSettings` reads `AssistantCapabilities.OllamaManager` through `useOptionalCapability`,
  // which resolves via `PluginManagerContext` — without a manager the hook raises rather than
  // returning undefined, so the story cannot render at all. No capabilities are registered: the
  // absent-Ollama branch is the one this story exercises.
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withPluginManager({ capabilities: [] })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof AssistantSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      customPrompts: false,
      modelProvider: Provider.edge.id,
    },
  },
};
