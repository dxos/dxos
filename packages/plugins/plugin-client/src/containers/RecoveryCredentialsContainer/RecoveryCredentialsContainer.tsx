//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { useCredentials } from '@dxos/react-client/halo';
import { Icon, IconButton, List, ListItem, Message, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { ClientOperation } from '#operations';

export const MANAGE_CREDENTIALS_DIALOG = `${meta.profile.key}.ManageCredentialsDialog`;

export const RecoveryCredentialsContainer = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const credentials = useCredentials();
  const recoveryCredentials = credentials.filter(
    (credential) => credential.subject.assertion['@type'] === 'dxos.halo.credentials.IdentityRecovery',
  );

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('recovery-setup-dialog.title')} description={t('recovery-setup-dialog.description')}>
            <Form.Row label={t('create-passkey.label')} description={t('create-passkey.description')}>
              <IconButton
                label={t('create-passkey.label')}
                icon='ph--key--duotone'
                variant='primary'
                onClick={() => invokePromise(ClientOperation.CreatePasskey)}
              />
            </Form.Row>
            <Form.Row label={t('create-recovery-code.label')} description={t('create-recovery-code.description')}>
              <IconButton
                label={t('create-recovery-code.label')}
                icon='ph--receipt--duotone'
                variant='default'
                onClick={() => invokePromise(ClientOperation.CreateRecoveryCode)}
              />
            </Form.Row>
          </Form.Section>
          <Form.Section title={t('credentials-list.label')}>
            {recoveryCredentials.length < 1 ? (
              <Message.Root valence='error'>
                <Message.Title icon='ph--shield-warning--duotone'>{t('no-credentials.title')}</Message.Title>
                <Message.Content>{t('no-credentials.message')}</Message.Content>
              </Message.Root>
            ) : (
              <List>
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
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
