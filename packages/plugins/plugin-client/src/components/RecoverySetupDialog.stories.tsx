//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { createResolver, contributes, Capabilities, IntentPlugin, LayoutAction } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { S } from '@dxos/echo-schema';
import { create } from '@dxos/live-object';
import { AlertDialog } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { RECOVER_CODE_DIALOG, RecoveryCodeDialog } from './RecoveryCodeDialog';
import { RecoverySetupDialog } from './RecoverySetupDialog';
import { ClientPlugin } from '../ClientPlugin';
import translations from '../translations';

const state = create<{ recoveryCode?: string }>({});

const Render = () => {
  return (
    <AlertDialog.Root open>
      <AlertDialog.Overlay>
        {state.recoveryCode ? <RecoveryCodeDialog code={state.recoveryCode} /> : <RecoverySetupDialog />}
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-client/RecoverySetupDialog',
  component: RecoverySetupDialog,
  render: Render,
  decorators: [
    withPluginManager({
      plugins: [
        IntentPlugin(),
        ClientPlugin({
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
      ],
      capabilities: [
        contributes(
          Capabilities.IntentResolver,
          createResolver({
            intent: LayoutAction.UpdateLayout,
            filter: (data): data is S.Schema.Type<typeof LayoutAction.UpdateDialog.fields.input> =>
              S.is(LayoutAction.UpdateDialog.fields.input)(data),
            resolve: (data) => {
              if (data.subject === RECOVER_CODE_DIALOG) {
                state.recoveryCode = data.options?.props?.code;
              }
            },
          }),
        ),
      ],
    }),
    withTheme,
    withLayout({ tooltips: true }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof RecoverySetupDialog>;

export const Default: Story = {};
