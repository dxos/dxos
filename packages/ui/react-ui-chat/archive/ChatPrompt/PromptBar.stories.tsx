//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { PromptBar } from './PromptBar';
import { translations } from '../../translations';

const meta: Meta<typeof PromptBar> = {
  title: 'ui/react-ui-chat/PromptBar',
  component: PromptBar,
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
    translations,
    controls: { disable: true },
  },
};

export default meta;

type Story = StoryObj<typeof PromptBar>;

export const Default: Story = {
  // args: {
  //   classNames: 'w-96 p-4 rounded outline outline-gray-200',
  // },
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
