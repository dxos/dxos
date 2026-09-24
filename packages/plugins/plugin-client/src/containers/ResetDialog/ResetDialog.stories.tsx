//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Dialog } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ClientPlugin } from '#plugin';
import { translations } from '#translations';

import { ResetDialog, type ResetDialogProps } from './ResetDialog.tsx';

const DefaultStory = (props: ResetDialogProps) => (
  <Dialog.Root open>
    <Dialog.Overlay>
      <ResetDialog {...props} />
    </Dialog.Overlay>
  </Dialog.Root>
);

const meta = {
  title: 'plugins/plugin-client/containers/ResetDialog',
  component: ResetDialog,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [ProcessManagerPlugin(), ClientPlugin({})],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ResetDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    mode: 'reset-storage' as const,
  } as any,
};

export const JoinNewIdentity: Story = {
  args: {
    mode: 'join-new-identity' as const,
  } as any,
};

export const Recover: Story = {
  args: {
    mode: 'recover' as const,
  } as any,
};
