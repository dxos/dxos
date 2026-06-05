//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomSet } from '@effect-atom/atom-react';
import React, { type FormEvent, useCallback, useState } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Context } from '@dxos/context';
import { createDidFromIdentityKey } from '@dxos/credentials';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, Icon, IconButton, Input, Message, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { ClientCapabilities } from '#types';

import { RESET_DIALOG } from '../../constants';
import { useHubHttpClient } from '../../state/use-hub-http';

type AccountState = 'loading' | 'present' | 'missing' | 'error';

export const AccountContainer = () => {
  const { t } = useTranslation(meta.id);
  const identity = useIdentity();
  const { invokePromise } = useOperationInvoker();
  const accountCacheAtom = useCapability(ClientCapabilities.AccountCache);
  const [cache] = useAtom(accountCacheAtom);
  const setCache = useAtomSet(accountCacheAtom);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [accountState, setAccountState] = useState<AccountState>(cache.account ? 'present' : 'loading');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Single shared instance keeps the VP-auth handshake (request → 401 → signed
  // retry) at one round-trip per session instead of one per panel.
  const hubHttp = useHubHttpClient();

  useAsyncEffect(async () => {
    if (!hubHttp) {
      return;
    }
    try {
      const account = await hubHttp.getAccount(new Context());
      setCache((prev) => ({ ...prev, account, fetchedAt: Date.now() }));
      setAccountState('present');
    } catch (err: any) {
      if (err?.data?.type === 'no_account') {
        setCache((prev) => ({ ...prev, account: undefined, fetchedAt: Date.now() }));
        setAccountState('missing');
      } else {
        setAccountState((prev) => (prev === 'present' ? 'present' : 'error'));
      }
    }
  }, [hubHttp, setCache]);

  const handleResend = useCallback(async () => {
    if (!hubHttp) {
      return;
    }
    try {
      const result = await hubHttp.resendVerificationEmail(new Context());
      if (result.sent) {
        setResendStatus(t('verification-sent.message'));
      } else if (result.cooldownSecondsRemaining) {
        setResendStatus(t('verification-cooldown.message', { seconds: result.cooldownSecondsRemaining }));
      } else {
        setResendStatus(t('verification-failed.message'));
      }
    } catch {
      setResendStatus(t('verification-failed.message'));
    }
  }, [hubHttp, t]);

  const handleRequestAccess = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const email = requestEmail.trim();
      if (!email || !hubHttp) {
        return;
      }
      try {
        const identityDid = identity ? await createDidFromIdentityKey(identity.identityKey) : undefined;
        await hubHttp.requestAccess(new Context(), { email, identityDid });
      } catch {
        // Surface a generic confirmation; failure details would leak signal.
      }
      setRequestSubmitted(true);
    },
    [hubHttp, identity, requestEmail],
  );

  // Opens the standard reset confirmation dialog. The `onBeforeReset` hook
  // deletes the hub account first; if that fails the reset is aborted so the
  // local identity is not wiped while the server record remains.
  const handleDeleteAccount = useCallback(() => {
    if (!hubHttp) {
      return;
    }
    void invokePromise(LayoutOperation.UpdateDialog, {
      subject: RESET_DIALOG,
      blockAlign: 'start',
      props: {
        mode: 'reset-storage',
        onBeforeReset: async () => {
          await hubHttp.deleteAccount(new Context());
          setCache(() => ({}));
        },
      },
    });
  }, [hubHttp, invokePromise, setCache]);

  const account = cache.account;

  return (
    <Settings.Viewport>
      <Settings.Section title={t('account-section.title')} description={t('account-section.description')}>
        {accountState === 'loading' ? null : accountState === 'missing' ? (
          <>
            <Message.Root valence='warning'>
              <Message.Title icon='ph--warning--duotone'>{t('no-edge-access.title')}</Message.Title>
              <Message.Content>{t('no-edge-access.description')}</Message.Content>
            </Message.Root>
            <Settings.Item title={t('request-access.label')} description={t('request-access.description')}>
              {requestSubmitted ? (
                <span className='text-sm text-description'>{t('access-request-submitted.message')}</span>
              ) : (
                <form onSubmit={handleRequestAccess} className='flex gap-2 items-center justify-end'>
                  <Input.Root>
                    <Input.TextInput
                      type='email'
                      required
                      placeholder={t('access-request-email.placeholder')}
                      value={requestEmail}
                      onChange={(event) => setRequestEmail(event.target.value)}
                      classNames='min-w-64'
                    />
                  </Input.Root>
                  <Button type='submit' density='sm'>
                    {t('request-access.label')}
                  </Button>
                </form>
              )}
            </Settings.Item>
          </>
        ) : accountState === 'error' && !account ? (
          <Message.Root valence='error'>
            <Message.Title icon='ph--cloud-x--duotone'>{t('account-offline.title')}</Message.Title>
            <Message.Content>{t('account-offline.description')}</Message.Content>
          </Message.Root>
        ) : account ? (
          <>
            <Settings.Item title={t('email.label')} description={account.email}>
              {account.emailVerified ? (
                <Icon icon='ph--check-circle--duotone' size={5} classNames='text-success-text justify-self-end' />
              ) : (
                <div className='flex flex-col gap-1 items-end'>
                  <IconButton
                    icon='ph--paper-plane-tilt--regular'
                    label={t('resend-verification.label')}
                    onClick={handleResend}
                    density='sm'
                  />
                  {resendStatus ? <span className='text-xs text-description'>{resendStatus}</span> : null}
                </div>
              )}
            </Settings.Item>
            <Settings.Item title={t('delete-account.label')} description={t('delete-account.description')}>
              <Button variant='destructive' density='sm' onClick={handleDeleteAccount}>
                {t('delete-account.label')}
              </Button>
            </Settings.Item>
          </>
        ) : null}
      </Settings.Section>
    </Settings.Viewport>
  );
};
