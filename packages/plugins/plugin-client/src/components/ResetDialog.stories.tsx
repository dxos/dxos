//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Dialog } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ResetDialog, type ResetDialogProps } from './ResetDialog';
import { translations } from '../translations';

const Render = (props: ResetDialogProps) => {
  return (
    <Dialog.Root open>
      <Dialog.Overlay>
        <ResetDialog onReset={() => console.log('reset')} {...props} />
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const meta: Meta<ResetDialogProps> = {
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
};

export default meta;

type Story = StoryObj<ResetDialogProps>;

export const Default: Story = { args: { mode: 'reset storage' } };

export const JoinNewIdentity: Story = { args: { mode: 'join new identity' } };

export const Recover: Story = { args: { mode: 'recover' } };
