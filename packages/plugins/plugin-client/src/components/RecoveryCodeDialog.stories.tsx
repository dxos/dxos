//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useState } from 'react';

import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { AlertDialog, useAsyncEffect } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { RecoveryCodeDialog, type RecoveryCodeDialogProps } from './RecoveryCodeDialog';
import translations from '../translations';

const DefaultStory = () => {
  const client = useClient();
  const [recoveryCode, setRecoveryCode] = useState<string>();
  useAsyncEffect(async () => {
    const { recoveryCode } = (await client.services.services.IdentityService?.createRecoveryCredential({})) ?? {};
    setRecoveryCode(recoveryCode);
  }, [client]);

  return (
    <AlertDialog.Root open={!!recoveryCode}>
      <AlertDialog.Overlay>
        <RecoveryCodeDialog code={recoveryCode ?? ''} />
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};

const meta: Meta<RecoveryCodeDialogProps> = {
  title: 'plugins/plugin-client/RecoveryCodeDialog',
  component: RecoveryCodeDialog,
  render: DefaultStory,
  decorators: [withClientProvider({ createIdentity: true }), withTheme, withLayout()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<RecoveryCodeDialogProps>;

export const Default: Story = {};
