//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Dialog } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';

import { ResetDialog, type ResetDialogProps } from './ResetDialog';

const Render = (props: ResetDialogProps) => {
  return (
    <Dialog.Root open>
      <Dialog.Overlay>
        <ResetDialog onReset={() => console.log('reset')} {...props} />
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const meta = {
  title: 'plugins/plugin-client/ResetDialog',
  component: ResetDialog,
  render: Render,
  decorators: [
    withPluginManager({
      plugins: [IntentPlugin()],
    }),
    withTheme,
    withLayout(),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ResetDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { mode: 'reset storage' } };

export const JoinNewIdentity: Story = { args: { mode: 'join new identity' } };

export const Recover: Story = { args: { mode: 'recover' } };
