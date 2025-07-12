//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { withTheme } from '@dxos/storybook-utils';

import { ChatPrompt } from './ChatPrompt';
import { translations } from '../../translations';

const meta = {
  title: 'plugins/plugin-assistant/ChatPrompt',
  component: ChatPrompt,
  decorators: [withPluginManager({ plugins: [] }), withTheme],
  render: (args) => {
    const [processing, setProcessing] = useState(false);
    useEffect(() => {
      let t: NodeJS.Timeout;
      if (processing) {
        t = setTimeout(() => setProcessing(false), 10_000);
      }
      return () => clearTimeout(t);
    }, [processing]);

    return (
      <ChatPrompt
        microphone
        processing={processing}
        onSubmit={() => setProcessing(true)}
        onCancel={() => setProcessing(false)}
        {...args}
      />
    );
  },
  parameters: {
    layout: 'centered',
    translations,
    controls: { disable: true },
  },
} satisfies Meta<typeof ChatPrompt>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
  args: {
    classNames: 'w-[25rem] p-1 overflow-hidden border border-gray-200 rounded',
    placeholder: 'Ask anything...',
  },
} satisfies Story;

export const Expanded = {
  args: {
    classNames: 'w-[40rem] p-1 overflow-hidden border border-gray-200 rounded',
    placeholder: 'Ask anything...',
    compact: false,
  },
} satisfies Story;
