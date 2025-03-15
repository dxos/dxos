//
// Copyright 2024 DXOS.org
//

import { Receipt, Key } from '@phosphor-icons/react';
import React, { useMemo } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { useCredentials } from '@dxos/react-client/halo';
import { Dialog, Icon, List, ListItem, useTranslation } from '@dxos/react-ui';
import { BifurcatedAction, type ActionMenuItem } from '@dxos/shell/react';

import { CLIENT_PLUGIN } from '../meta';
import { ClientAction } from '../types';

export const MANAGE_CREDENTIALS_DIALOG = `${CLIENT_PLUGIN}/ManageCredentialsDialog`;

// TODO(wittjosiah): Factor panel out to @dxos/shell.
export const ManageCredentialsDialog = () => {
  const { t } = useTranslation(CLIENT_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const credentials = useCredentials();
  const recoveryCredentials = credentials.filter(
    (credential) => credential.subject.assertion['@type'] === 'dxos.halo.credentials.IdentityRecovery',
  );

  // TODO(wittjosiah): Reconsile w/ RecoverySetupDialog actions.
  const actions: Record<string, ActionMenuItem> = useMemo(
    () => ({
      createPasskey: {
        label: t('create passkey label'),
        description: t('create passkey description'),
        // TODO(wittjosiah): Ideally this would be a `user-key` icon.
        icon: Key,
        onClick: () => dispatch(createIntent(ClientAction.CreatePasskey)),
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
    <Dialog.Content classNames='bs-content min-bs-[15rem] max-bs-full md:max-is-[25rem] overflow-hidden'>
      <Dialog.Title>{t('manage credentials dialog title')}</Dialog.Title>
      <List classNames='py-4'>
        {recoveryCredentials.map((credential) => (
          <ListItem.Root key={credential.id?.toHex()}>
            <ListItem.Endcap>
              <Icon icon='ph--key--regular' size={5} />
            </ListItem.Endcap>
            <ListItem.Heading>{credential.issuanceDate.toLocaleString()}</ListItem.Heading>
          </ListItem.Root>
        ))}
      </List>
      <div className='grow' />
      <BifurcatedAction actions={actions} />
    </Dialog.Content>
  );
};
