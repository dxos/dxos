//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { Dialog } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { AmbientChatDialog } from './AmbientChatDialog';
import translations from '../../translations';

const meta: Meta<typeof AmbientChatDialog> = {
  title: 'plugins/plugin-automation/AmbientChatDialog',
  component: AmbientChatDialog,
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <AmbientChatDialog />
      </Dialog.Root>
    );
  },
  decorators: [withTheme, withLayout({ fullscreen: true, tooltips: true })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof AmbientChatDialog>;

export const Default: Story = {};
