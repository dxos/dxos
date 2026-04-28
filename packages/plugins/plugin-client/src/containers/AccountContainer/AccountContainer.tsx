//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomSet } from '@effect-atom/atom-react';
import React, { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { createEdgeIdentity } from '@dxos/client/edge';
import { Context } from '@dxos/context';
import { EdgeHttpClient } from '@dxos/edge-client';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, Input, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { accountCacheAtom } from '../../state/account-cache';

type AccountState = 'loading' | 'present' | 'missing' | 'error';

/**
 * Profile-page Account panel. Self-contained: fetches via `client.edge.http`,
 * caches in localStorage via `accountCacheAtom`, and renders one of three states:
 * - `present`: signed-in identity is bound to a Hub Account; show email/role/quota.
 * - `missing`: identity has no Account binding; show "no edge access" warning + request-access form.
 * - `error`: network/unknown error; surface a brief offline notice while keeping cached state.
 */
export const AccountContainer = () => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const identity = useIdentity();
  const [cache] = useAtom(accountCacheAtom);
  const setCache = useAtomSet(accountCacheAtom);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [accountState, setAccountState] = useState<AccountState>(cache.account ? 'present' : 'loading');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Hub HTTP client (separate from `client.edge.http` because account/invitation
  // routes live on hub-service, not the edge worker). Uses VP auth via the
  // signed-in identity.
  const hubHttp = useMemo(() => {
    const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
    if (!hubUrl || !identity) {
      return undefined;
    }
    const httpClient = new EdgeHttpClient(hubUrl);
    httpClient.setIdentity(createEdgeIdentity(client));
    return httpClient;
  }, [client, identity]);

  // Background refresh on mount.
  useEffect(() => {
    if (!hubHttp) {
      return;
    }
    let cancelled = false;
    (async () => {
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
        setResendStatus(t('verification email sent'));
      } else if (result.cooldownSecondsRemaining) {
        setResendStatus(t('verification cooldown', { seconds: result.cooldownSecondsRemaining }));
      } else {
        setResendStatus(t('verification not sent'));
      }
    } catch {
      setResendStatus(t('verification not sent'));
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
        // Surface a generic confirmation -- we don't want to leak failure details.
      }
      setRequestSubmitted(true);
    },
    [hubHttp, identity, requestEmail],
  );

  const account = cache.account;

  return (
    <Settings.Viewport>
      <Settings.Section title={t('account section title')}>
        {accountState === 'loading' ? (
          <Settings.Item title={t('account loading')} />
        ) : accountState === 'missing' ? (
          <>
            <Settings.Item title={t('no edge access title')} description={t('no edge access description')} />
            <Settings.Item title={t('request access button')}>
              {requestSubmitted ? (
                <span className='text-sm'>{t('access request submitted')}</span>
              ) : (
                <form onSubmit={handleRequestAccess} className='flex gap-2 items-center'>
                  <Input.Root>
                    <Input.TextInput
                      type='email'
                      required
                      placeholder={t('access request email placeholder')}
                      value={requestEmail}
                      onChange={(event) => setRequestEmail(event.target.value)}
                      classNames='min-w-64'
                    />
                  </Input.Root>
                  <Button type='submit' density='fine'>
                    {t('request access button')}
                  </Button>
                </form>
              )}
            </Settings.Item>
          </>
        ) : account ? (
          <>
            <Settings.Item title={t('email label')} description={account.email}>
              {!account.emailVerified ? (
                <div className='flex flex-col gap-1 items-end'>
                  <Button onClick={handleResend} density='fine'>
                    {t('resend verification')}
                  </Button>
                  {resendStatus ? <span className='text-xs'>{resendStatus}</span> : null}
                </div>
              ) : (
                <span className='text-sm'>✓</span>
              )}
            </Settings.Item>
            <Settings.Item title={t('role label')} description={account.role} />
            <Settings.Item
              title={t('invitations remaining label')}
              description={String(account.invitationsRemaining)}
            />
          </>
        ) : (
          <Settings.Item title={t('account offline')} />
        )}
      </Settings.Section>
    </Settings.Viewport>
  );
};
