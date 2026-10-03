//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as NativePasskey from '@dxos/app-toolkit/NativePasskey';
import { type Identity } from '@dxos/halo';
import { useCredentials } from '@dxos/halo-react';
import { log } from '@dxos/log';
import { Banner, Button, Icon, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { ClientOperation } from '#operations';
import { PasskeyError } from '#types';

import { useAccountUrl } from '../../hooks/index.ts';

export const MANAGE_CREDENTIALS_DIALOG = `${meta.profile.key}.ManageCredentialsDialog`;

const supportsPasskeys = NativePasskey.getPasskeySupport() !== 'none';

/** Icon per recovery kind, so a passkey is distinguishable from a recovery code at a glance. */
const KIND_ICONS: Record<Identity.RecoveryKind, string> = {
  'passkey': 'ph--key--regular',
  'recovery-code': 'ph--receipt--regular',
  'oauth': 'ph--user-circle--regular',
  'unknown': 'ph--question--regular',
};

export const RecoveryCredentialsContainer = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const credentials = useCredentials();
  const recoveryCredentials = credentials.filter(
    (credential) => credential.type === 'dxos.halo.credentials.IdentityRecovery',
  );
  const activeCount = recoveryCredentials.filter((credential) => !credential.recovery?.revoked).length;
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // The account page is where a revocation can also be confirmed with a fresh passkey assertion.
  const { openAccountPage } = useAccountUrl();

  const handleCreatePasskey = useCallback(async () => {
    setCreateError(null);
    const { error } = await invokePromise(ClientOperation.CreatePasskey);
    // A dismissed prompt is the user changing their mind, not a failure to report.
    if (error && PasskeyError.report(error) !== 'dismissed') {
      setCreateError(t('create-passkey-failed.message'));
    }
  }, [invokePromise, t]);

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
            {supportsPasskeys && (
              <Form.Field standalone label={t('create-passkey.label')} description={t('create-passkey.description')}>
                <Button
                  label={t('create-passkey.label')}
                  icon='ph--key--duotone'
                  variant='primary'
                  onClick={handleCreatePasskey}
                />
              </Form.Field>
            )}
            {createError && (
              <Banner.Root valence='error'>
                <Banner.Body>{createError}</Banner.Body>
              </Banner.Root>
            )}
            <Form.Field
              standalone
              label={t('create-recovery-code.label')}
              description={t('create-recovery-code.description')}
            >
              <Button
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
              <Banner.Root valence='error'>
                <Banner.Title icon='ph--shield-warning--duotone'>{t('no-credentials.title')}</Banner.Title>
                <Banner.Body>{t('no-credentials.message')}</Banner.Body>
              </Banner.Root>
            ) : (
              <Listbox.Root
                items={recoveryCredentials.map((credential, index) => ({
                  value: credential.id ?? `${index}`,
                  label: credential.recovery?.label ?? credential.id ?? `${index}`,
                }))}
              >
                <Listbox.Content classNames='gap-1'>
                  {recoveryCredentials.map((credential, index) => {
                    const { lookupKey, label, kind = 'unknown', revoked } = credential.recovery ?? { revoked: false };
                    return (
                      <Listbox.Item key={credential.id ?? index} id={credential.id ?? `${index}`} classNames='gap-2'>
                        <Icon icon={KIND_ICONS[kind]} />
                        <Listbox.ItemText classNames={revoked ? 'text-fg-subtle line-through' : undefined}>
                          {label ?? t(`recovery-kind-${kind}.label`)}
                        </Listbox.ItemText>
                        <span className='text-fg-muted text-sm'>{credential.issuanceDate?.toLocaleString()}</span>
                        {revoked ? (
                          <span className='text-fg-subtle text-sm'>{t('credential-revoked.label')}</span>
                        ) : (
                          // Withheld on the last one: revoking it would leave no way to recover the
                          // identity, and there is no self-service way back.
                          lookupKey &&
                          activeCount > 1 && (
                            <Button
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
              <Banner.Root valence='error'>
                <Banner.Body>{revokeError}</Banner.Body>
              </Banner.Root>
            )}
            {activeCount === 1 && (
              <Banner.Root valence='warning'>
                <Banner.Body>{t('last-credential.message')}</Banner.Body>
              </Banner.Root>
            )}
            {recoveryCredentials.length > 0 && (
              <Form.Field standalone label={t('manage-passkeys.label')} description={t('manage-passkeys.description')}>
                <Button
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
