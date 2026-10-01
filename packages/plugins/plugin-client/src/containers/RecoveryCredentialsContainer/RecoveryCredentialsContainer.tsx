//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type Identity } from '@dxos/halo';
import { useCredentials } from '@dxos/halo-react';
import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form/next';
import { Listbox } from '@dxos/react-ui-list/next';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';
import { ClientOperation } from '#operations';

import { useAccountUrl } from '../../hooks/index.ts';

export const MANAGE_CREDENTIALS_DIALOG = `${meta.profile.key}.ManageCredentialsDialog`;

/** Icon per recovery kind, so a passkey is distinguishable from a recovery code at a glance. */
const KIND_ICONS: Record<Identity.RecoveryKind, string> = {
  'passkey': 'ph--key--regular',
  'recovery-code': 'ph--receipt--regular',
  'oauth': 'ph--user-circle--regular',
  'unknown': 'ph--question--regular',
};

export const RecoveryCredentialsContainer = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const credentials = useCredentials();
  const recoveryCredentials = credentials.filter(
    (credential) => credential.type === 'dxos.halo.credentials.IdentityRecovery',
  );
  const activeCount = recoveryCredentials.filter((credential) => !credential.recovery?.revoked).length;
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // The account page is where a revocation can also be confirmed with a fresh passkey assertion.
  const { openAccountPage } = useAccountUrl();

  const handleRevoke = useCallback(
    (lookupKey: string) => {
      // Revoking is not undoable and the passkey survives in the authenticator, so say both before
      // writing anything.
      if (!window.confirm(t('revoke-credential-confirm.message'))) {
        return;
      }
      setRevokeError(null);
      // Surfaced rather than rethrown: `onClick` does not await, so an escaping rejection would only
      // reach the console and the row would silently stay.
      void invokePromise(ClientOperation.RevokeRecoveryCredential, { lookupKey }).catch((error) => {
        log.warn('failed to revoke recovery credential', { error });
        setRevokeError(t('revoke-failed.message'));
      });
    },
    [invokePromise, t],
  );

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('recovery-setup-dialog.title')} description={t('recovery-setup-dialog.description')}>
            <Form.Field standalone label={t('create-passkey.label')} description={t('create-passkey.description')}>
              <Next.Button
                label={t('create-passkey.label')}
                icon='ph--key--duotone'
                variant='primary'
                onClick={() => invokePromise(ClientOperation.CreatePasskey)}
              />
            </Form.Field>
            <Form.Field
              standalone
              label={t('create-recovery-code.label')}
              description={t('create-recovery-code.description')}
            >
              <Next.Button
                label={t('create-recovery-code.label')}
                icon='ph--receipt--duotone'
                variant='default'
                onClick={() => invokePromise(ClientOperation.CreateRecoveryCode)}
                data-testid='recoveryCredentials.createRecoveryCode'
              />
            </Form.Field>
          </Form.FieldSet>
          <Form.FieldSet label={t('credentials-list.label')}>
            {recoveryCredentials.length < 1 ? (
              <Next.Banner.Root valence='error'>
                <Next.Banner.Title icon='ph--shield-warning--duotone'>{t('no-credentials.title')}</Next.Banner.Title>
                <Next.Banner.Body>{t('no-credentials.message')}</Next.Banner.Body>
              </Next.Banner.Root>
            ) : (
              <Listbox.Root>
                <Listbox.Content classNames='gap-1'>
                  {recoveryCredentials.map((credential, index) => {
                    const { lookupKey, label, kind = 'unknown', revoked } = credential.recovery ?? { revoked: false };
                    return (
                      <Listbox.Item key={credential.id ?? index} id={credential.id ?? `${index}`} classNames='gap-2'>
                        <Next.Icon icon={KIND_ICONS[kind]} />
                        <Listbox.ItemText classNames={revoked ? 'text-subdued line-through' : undefined}>
                          {label ?? t(`recovery-kind-${kind}.label`)}
                        </Listbox.ItemText>
                        <span className='text-description text-sm'>{credential.issuanceDate?.toLocaleString()}</span>
                        {revoked ? (
                          <span className='text-subdued text-sm'>{t('credential-revoked.label')}</span>
                        ) : (
                          // Withheld on the last one: revoking it would leave no way to recover the
                          // identity, and there is no self-service way back.
                          lookupKey &&
                          activeCount > 1 && (
                            <Next.Button
                              iconOnly
                              label={t('revoke-credential.label')}
                              icon='ph--trash--regular'
                              variant='ghost'
                              onClick={() => handleRevoke(lookupKey)}
                            />
                          )
                        )}
                      </Listbox.Item>
                    );
                  })}
                </Listbox.Content>
              </Listbox.Root>
            )}
            {revokeError && (
              <Next.Banner.Root valence='error'>
                <Next.Banner.Body>{revokeError}</Next.Banner.Body>
              </Next.Banner.Root>
            )}
            {activeCount === 1 && (
              <Next.Banner.Root valence='warning'>
                <Next.Banner.Body>{t('last-credential.message')}</Next.Banner.Body>
              </Next.Banner.Root>
            )}
            {recoveryCredentials.length > 0 && (
              <Form.Field standalone label={t('manage-passkeys.label')} description={t('manage-passkeys.description')}>
                <Next.Button
                  label={t('manage-passkeys.label')}
                  icon='ph--arrow-square-out--regular'
                  variant='default'
                  onClick={openAccountPage}
                />
              </Form.Field>
            )}
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

RecoveryCredentialsContainer.displayName = 'RecoveryCredentialsContainer';
