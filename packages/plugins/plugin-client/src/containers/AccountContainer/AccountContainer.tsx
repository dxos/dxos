//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomSet } from '@effect/atom-react/Hooks';
import React, { type FormEvent, useCallback, useState } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Context } from '@dxos/context';
import { useIdentity } from '@dxos/halo-react';
import { Banner, Button, Field, Flex, Icon, IconButton, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { ClientCapabilities } from '#types';

import { RESET_DIALOG } from '../../constants';
import { useAccountUrl, useEdgeHttpClient } from '../../hooks';

type AccountState = 'loading' | 'present' | 'missing' | 'error';

export const AccountContainer = () => {
  const { t } = useTranslation(meta.profile.key);
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
  const edgeHttp = useEdgeHttpClient();
  const { openAccountPage } = useAccountUrl();

  useAsyncEffect(async () => {
    if (!edgeHttp) {
      return;
    }
    try {
      const account = await edgeHttp.getAccount(new Context());
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
  }, [edgeHttp, setCache]);

  const handleResend = useCallback(async () => {
    if (!edgeHttp) {
      return;
    }
    try {
      const result = await edgeHttp.resendVerificationEmail(new Context());
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
  }, [edgeHttp, t]);

  const handleRequestAccess = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const email = requestEmail.trim();
      if (!email || !edgeHttp) {
        return;
      }
      try {
        const identityDid = identity?.did;
        await edgeHttp.requestAccess(new Context(), { email, identityDid });
      } catch {
        // Surface a generic confirmation; failure details would leak signal.
      }
      setRequestSubmitted(true);
    },
    [edgeHttp, identity, requestEmail],
  );

  // Opens the standard reset confirmation dialog. The `onBeforeReset` hook
  // deletes the hub account first; if that fails the reset is aborted so the
  // local identity is not wiped while the server record remains.
  const handleDeleteAccount = useCallback(() => {
    if (!edgeHttp) {
      return;
    }
    void invokePromise(LayoutOperation.UpdateDialog, {
      subject: RESET_DIALOG,
      blockAlign: 'start',
      props: {
        mode: 'reset-storage',
        onBeforeReset: async () => {
          await edgeHttp.deleteAccount(new Context());
          setCache(() => ({}));
        },
      },
    });
  }, [edgeHttp, invokePromise, setCache]);

  const account = cache.account;

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('account-section.title')} description={t('account-section.description')}>
            {accountState === 'loading' ? null : accountState === 'missing' ? (
              <>
                <Banner.Root valence='warning'>
                  <Banner.Content>
                    <Banner.Title icon='ph--warning--duotone'>{t('no-edge-access.title')}</Banner.Title>
                    <Banner.Body>{t('no-edge-access.description')}</Banner.Body>
                  </Banner.Content>
                </Banner.Root>
                <Form.Field standalone label={t('request-access.label')} description={t('request-access.description')}>
                  {requestSubmitted ? (
                    <span className='text-sm text-description'>{t('access-request-submitted.message')}</span>
                  ) : (
                    <form onSubmit={handleRequestAccess} className='flex gap-2 items-center justify-end'>
                      <Field.Root>
                        <Field.Input
                          type='email'
                          required
                          placeholder={t('access-request-email.placeholder')}
                          value={requestEmail}
                          onChange={(event) => setRequestEmail(event.target.value)}
                          classNames='w-64 max-w-full min-w-0'
                        />
                      </Field.Root>
                      <Button type='submit' density='sm'>
                        {t('request-access.label')}
                      </Button>
                    </form>
                  )}
                </Form.Field>
              </>
            ) : accountState === 'error' && !account ? (
              <Banner.Root valence='error'>
                <Banner.Content>
                  <Banner.Title icon='ph--cloud-x--duotone'>{t('account-offline.title')}</Banner.Title>
                  <Banner.Body>{t('account-offline.description')}</Banner.Body>
                </Banner.Content>
              </Banner.Root>
            ) : account ? (
              <>
                <Form.Field standalone label={t('email.label')} description={account.email}>
                  {account.emailVerified ? (
                    <Icon icon='ph--check-circle--duotone' size={5} classNames='text-success-text justify-self-end' />
                  ) : (
                    <Flex column gap='xs' align='end'>
                      <IconButton
                        icon='ph--paper-plane-tilt--regular'
                        label={t('resend-verification.label')}
                        onClick={handleResend}
                        density='sm'
                      />
                      {resendStatus ? <span className='text-xs text-description'>{resendStatus}</span> : null}
                    </Flex>
                  )}
                </Form.Field>
                <Form.Field standalone label={t('delete-account.label')} description={t('delete-account.description')}>
                  <Button variant='destructive' onClick={handleDeleteAccount}>
                    {t('delete-account.label')}
                  </Button>
                </Form.Field>
              </>
            ) : null}
          </Form.FieldSet>
          {account ? (
            <Form.FieldSet label={t('account-page-section.title')} description={t('account-page-section.description')}>
              <Form.Field
                standalone
                label={t('open-account-page.label')}
                description={t('open-account-page.description')}
              >
                <IconButton
                  icon='ph--arrow-square-out--regular'
                  label={t('open-account-page.label')}
                  variant='default'
                  onClick={openAccountPage}
                />
              </Form.Field>
            </Form.FieldSet>
          ) : null}
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

AccountContainer.displayName = 'AccountContainer';
