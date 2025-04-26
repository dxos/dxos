//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { useCredentials } from '@dxos/react-client/halo';
import { Icon, IconButton, List, ListItem, useTranslation, Message } from '@dxos/react-ui';
import { ControlGroup, ControlItem, ControlSection } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { CLIENT_PLUGIN } from '../meta';
import { ClientAction } from '../types';

export const MANAGE_CREDENTIALS_DIALOG = `${CLIENT_PLUGIN}/ManageCredentialsDialog`;

export const RecoveryCredentialsContainer = () => {
  const { t } = useTranslation(CLIENT_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const credentials = useCredentials();
  const recoveryCredentials = credentials.filter(
    (credential) => credential.subject.assertion['@type'] === 'dxos.halo.credentials.IdentityRecovery',
  );

  return (
    <StackItem.Content classNames='p-2 block overflow-y-auto'>
      <ControlSection title={t('recovery setup dialog title')} description={t('recovery setup dialog description')}>
        <ControlGroup>
          <ControlItem title={t('create passkey label')} description={t('create passkey description')}>
            <IconButton
              label={t('create passkey label')}
              icon='ph--key--duotone'
              variant='primary'
              size={5}
              onClick={() => dispatch(createIntent(ClientAction.CreatePasskey))}
            />
          </ControlItem>
          <ControlItem title={t('create recovery code label')} description={t('create recovery code description')}>
            <IconButton
              label={t('create recovery code label')}
              icon='ph--receipt--duotone'
              variant='default'
              size={5}
              onClick={() => dispatch(createIntent(ClientAction.CreateRecoveryCode))}
            />
          </ControlItem>
        </ControlGroup>
      </ControlSection>
      <ControlSection title={t('credentials list label')}>
        {recoveryCredentials.length < 1 ? (
          <Message.Root valence='error' className='container-max-width'>
            <Message.Title>
              <Icon icon='ph--shield-warning--duotone' size={5} classNames='inline-block align-top mbs-px mie-1' />
              {t('no credentials title')}
            </Message.Title>
            <Message.Body>{t('no credentials message')}</Message.Body>
          </Message.Root>
        ) : (
          <List classNames='container-max-width pli-2'>
            {recoveryCredentials.map((credential) => (
              <ListItem.Root key={credential.id?.toHex()}>
                <ListItem.Endcap>
                  <Icon icon='ph--key--regular' size={5} />
                </ListItem.Endcap>
                <ListItem.Heading>{credential.issuanceDate.toLocaleString()}</ListItem.Heading>
              </ListItem.Root>
            ))}
          </List>
        )}
      </ControlSection>
    </StackItem.Content>
  );
};
