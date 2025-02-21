//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';

import { withTheme, withSignals } from '@dxos/storybook-utils';

import { Prompt } from './Prompt';

const meta: Meta<typeof Prompt> = {
  title: 'plugins/plugin-automation/Prompt',
  component: Prompt,
  decorators: [withSignals, withTheme],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Prompt>;

export const Default: Story = {
  args: {
    classNames: 'w-96 p-4 outline outline-gray-200',
    autoFocus: true,
    onEnter: (text) => {
      console.log('onEnter', text);
    },
    onSuggest: (text) => {
      const trimmed = text.trim().toLowerCase();
      if (trimmed.length < 2) {
        return [];
      }

      const suggestions = [
        'Find flights to Tokyo',
        'Create a CRM',
        'Create a new project',
        "Let's play chess",
        'Show me Paris on a map',
      ];

      return suggestions.filter((s) => s.toLowerCase().startsWith(text));
    },
  },
};
