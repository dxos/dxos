//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { AlertDialog, useAsyncEffect } from '@dxos/react-ui';

import { translations } from '../translations';

import { RecoveryCodeDialog } from './RecoveryCodeDialog';

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

const meta = {
  title: 'plugins/plugin-client/RecoveryCodeDialog',
  component: RecoveryCodeDialog as any,
  render: DefaultStory,
  decorators: [withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
