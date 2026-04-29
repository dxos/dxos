//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomSet } from '@effect-atom/atom-react';
import React, { type FormEvent, useCallback, useEffect, useState } from 'react';

import { Context } from '@dxos/context';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, Icon, IconButton, Input, Message, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { accountCacheAtom } from '../../state/account-cache';
import { useHubHttpClient } from '../../state/use-hub-http';

type AccountState = 'loading' | 'present' | 'missing' | 'error';

export const AccountContainer = () => {
  const { t } = useTranslation(meta.id);
  const identity = useIdentity();
  const [cache] = useAtom(accountCacheAtom);
  const setCache = useAtomSet(accountCacheAtom);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [accountState, setAccountState] = useState<AccountState>(cache.account ? 'present' : 'loading');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Single shared instance keeps the VP-auth handshake (request → 401 → signed
  // retry) at one round-trip per session instead of one per panel.
  const hubHttp = useHubHttpClient();

  useEffect(() => {
    if (!hubHttp) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const account = await hubHttp.getAccount(new Context());
        if (cancelled) {
          return;
        }
        setCache((prev) => ({ ...prev, account, fetchedAt: Date.now() }));
        setAccountState('present');
      } catch (err: any) {
        if (cancelled) {
          return;
        }
        if (err?.data?.type === 'no_account') {
          setCache((prev) => ({ ...prev, account: undefined, fetchedAt: Date.now() }));
          setAccountState('missing');
        } else {
          setAccountState((prev) => (prev === 'present' ? 'present' : 'error'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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
        const identityKey = identity?.identityKey.toHex();
        await hubHttp.requestAccess(new Context(), { email, identityKey });
      } catch {
        // Surface a generic confirmation; failure details would leak signal.
      }
      setRequestSubmitted(true);
    },
    [hubHttp, identity, requestEmail],
  );

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
                  <Button type='submit' density='fine'>
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
          <Settings.Item title={t('email.label')} description={account.email}>
            {account.emailVerified ? (
              <Icon icon='ph--check-circle--duotone' size={5} classNames='text-success-text justify-self-end' />
            ) : (
              <div className='flex flex-col gap-1 items-end'>
                <IconButton
                  icon='ph--paper-plane-tilt--regular'
                  label={t('resend-verification.label')}
                  onClick={handleResend}
                  density='fine'
                />
                {resendStatus ? <span className='text-xs text-description'>{resendStatus}</span> : null}
              </div>
            )}
          </Settings.Item>
        ) : null}
      </Settings.Section>
    </Settings.Viewport>
  );
};
