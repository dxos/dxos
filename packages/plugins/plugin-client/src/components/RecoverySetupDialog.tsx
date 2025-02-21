//
// Copyright 2024 DXOS.org
//

import { Key, Receipt } from '@phosphor-icons/react';
import React, { useMemo } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { AlertDialog, useTranslation } from '@dxos/react-ui';
import { type ActionMenuItem, BifurcatedAction } from '@dxos/shell/react';

import { CLIENT_PLUGIN } from '../meta';
import { ClientAction } from '../types';

export const RECOVER_SETUP_DIALOG = `${CLIENT_PLUGIN}/RecoverySetupDialog`;

// TODO(wittjosiah): Factor out to @dxos/shell.
export const RecoverySetupDialog = () => {
  const { t } = useTranslation(CLIENT_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const actions: Record<string, ActionMenuItem> = useMemo(
    () => ({
      createPasskey: {
        label: t('create passkey label'),
        description: t('create passkey description'),
        // TODO(wittjosiah): Ideally this would be a `user-key` icon.
        icon: Key,
        onClick: async () => {
          await dispatch(createIntent(ClientAction.CreatePasskey));
          await dispatch(createIntent(LayoutAction.UpdateDialog, { part: 'dialog', options: { state: false } }));
        },
      },
      createRecoveryCode: {
        label: t('create recovery code label'),
        description: t('create recovery code description'),
        icon: Receipt,
        onClick: () => dispatch(createIntent(ClientAction.CreateRecoveryCode)),
      },
    }),
    [t],
  );

  return (
    <AlertDialog.Content classNames='bs-content min-bs-[15rem] max-bs-full md:max-is-[25rem] overflow-hidden'>
      <AlertDialog.Title>{t('recovery setup dialog title')}</AlertDialog.Title>
      <p className='py-4'>{t('recovery setup dialog description')}</p>
      <div className='grow' />
      <BifurcatedAction actions={actions} />
    </AlertDialog.Content>
  );
};
