//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { AlertDialog, useAsyncEffect } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { RecoveryCodeDialog, type RecoveryCodeDialogProps } from './RecoveryCodeDialog';
import translations from '../translations';

const Render = () => {
  const client = useClient();
  const [seedphrase, setSeedphrase] = useState<string>();
  useAsyncEffect(async () => {
    const { seedphrase } = (await client.services.services.IdentityService?.createRecoveryPhrase()) ?? {};
    setSeedphrase(seedphrase);
  }, [client]);

  return (
    <AlertDialog.Root open={!!seedphrase}>
      <AlertDialog.Overlay>
        <RecoveryCodeDialog code={seedphrase ?? ''} />
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};

const meta: Meta<RecoveryCodeDialogProps> = {
  title: 'plugins/plugin-client/RecoveryCodeDialog',
  component: RecoveryCodeDialog,
  render: Render,
  decorators: [withClientProvider({ createIdentity: true }), withTheme, withLayout({ tooltips: true })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<RecoveryCodeDialogProps>;

export const Default: Story = {};
