//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Prompt } from './Prompt';
import { PromptBar } from './PromptBar';
import type { ReferenceData } from './references';
import translations from '../../translations';

const meta: Meta<typeof Prompt> = {
  title: 'plugins/plugin-automation/Prompt',
  component: Prompt,
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Prompt>;

export const Default: Story = {
  args: {
    classNames: 'w-96 p-4 rounded outline outline-gray-200',
    autoFocus: true,
    onSubmit: (text) => {
      console.log('onEnter', text);
    },
    onSuggest: (text) => {
      const trimmed = text.trim().toLowerCase();
      if (trimmed.length < 2) {
        return [];
      }

      const suggestions = [
        'Create a kanban board',
        'Create a new project',
        'Find flights to Tokyo',
        "Let's play chess",
        'Show me Paris on a map',
      ];

      return suggestions.filter((s) => s.toLowerCase().startsWith(text));
    },
  },
};

export const Toolbar: Story = {
  render: (args) => {
    const [processing, setProcessing] = useState(false);
    useEffect(() => {
      let t: NodeJS.Timeout;
      if (processing) {
        t = setTimeout(() => setProcessing(false), 10_000);
      }
      return () => clearTimeout(t);
    }, [processing]);
    console.log('processing', processing);

    return (
      <PromptBar
        classNames='w-[25rem] p-1 overflow-hidden border border-gray-200 rounded'
        microphone
        processing={processing}
        onSubmit={() => setProcessing(true)}
        onCancel={() => setProcessing(false)}
        {...args}
      />
    );
  },
};

export const Includes: Story = {
  args: {
    classNames: 'w-96 p-4 rounded outline outline-gray-200',
    references: {
      getReferences: async ({ query }) => {
        const res = references.filter((i) => i.label.toLowerCase().startsWith(query.toLowerCase()));
        console.log('getReferences', { query, res });
        return res;
      },
      resolveReference: async ({ uri }) => {
        const res = references.find((i) => i.uri === uri);
        console.log('resolveReference', { uri, res });
        return res ?? null;
      },
    },
  },
};

const references: ReferenceData[] = [
  {
    uri: 'dxn:echo:@:AAAAAAAA',
    label: 'Meeting Notes',
  },
  {
    uri: 'dxn:echo:@:BBBBBBBB',
    label: 'Project Plan',
  },
  {
    uri: 'dxn:echo:@:CCCCCCCC',
    label: 'Meeting Plan',
  },
];
