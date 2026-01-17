//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { OperationPlugin } from '@dxos/app-framework';
import { usePluginManager } from '@dxos/app-framework/react';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Dialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { ClientPlugin } from '../ClientPlugin';
import { translations } from '../translations';

import { ResetDialog, type ResetDialogProps } from './ResetDialog';

const Render = (props: Omit<ResetDialogProps, 'context'>) => {
  const manager = usePluginManager();
  const context = manager.context;

  return (
    <Dialog.Root open>
      <Dialog.Overlay>
        <ResetDialog onReset={() => Effect.sync(() => console.log('reset'))} context={context} {...props} />
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const meta = {
  title: 'plugins/plugin-client/ResetDialog',
  component: ResetDialog,
  render: Render as any,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [OperationPlugin(), ClientPlugin({})],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ResetDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { mode: 'reset storage' as const } as any };

export const JoinNewIdentity: Story = { args: { mode: 'join new identity' as const } as any };

export const Recover: Story = { args: { mode: 'recover' as const } as any };
