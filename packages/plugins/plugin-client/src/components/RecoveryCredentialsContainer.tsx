//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { useCredentials } from '@dxos/react-client/halo';
import { Icon, IconButton, List, ListItem, Message, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItem, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { ClientAction } from '../types';

export const MANAGE_CREDENTIALS_DIALOG = `${meta.id}/ManageCredentialsDialog`;

export const RecoveryCredentialsContainer = () => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const credentials = useCredentials();
  const recoveryCredentials = credentials.filter(
    (credential) => credential.subject.assertion['@type'] === 'dxos.halo.credentials.IdentityRecovery',
  );

  return (
    <ControlPage>
      <ControlSection title={t('recovery setup dialog title')} description={t('recovery setup dialog description')}>
        <ControlGroup>
          <ControlItem title={t('create passkey label')} description={t('create passkey description')}>
            <IconButton
              label={t('create passkey label')}
              icon='ph--key--duotone'
              variant='primary'
              onClick={() => dispatch(createIntent(ClientAction.CreatePasskey))}
            />
          </ControlItem>
          <ControlItem title={t('create recovery code label')} description={t('create recovery code description')}>
            <IconButton
              label={t('create recovery code label')}
              icon='ph--receipt--duotone'
              variant='default'
              onClick={() => dispatch(createIntent(ClientAction.CreateRecoveryCode))}
            />
          </ControlItem>
        </ControlGroup>
      </ControlSection>
      <ControlSection title={t('credentials list label')}>
        {recoveryCredentials.length < 1 ? (
          <Message.Root valence='error' classNames='container-max-width'>
            <Message.Title icon='ph--shield-warning--duotone'>{t('no credentials title')}</Message.Title>
            <Message.Content>{t('no credentials message')}</Message.Content>
          </Message.Root>
        ) : (
          <List classNames='container-max-width pli-2'>
            {recoveryCredentials.map((credential) => (
              <ListItem.Root key={credential.id?.toHex()}>
                <ListItem.Endcap>
                  <Icon icon='ph--key--regular' />
                </ListItem.Endcap>
                <ListItem.Heading>{credential.issuanceDate.toLocaleString()}</ListItem.Heading>
              </ListItem.Root>
            ))}
          </List>
        )}
      </ControlSection>
    </ControlPage>
  );
};
