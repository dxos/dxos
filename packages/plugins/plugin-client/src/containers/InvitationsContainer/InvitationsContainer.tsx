//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomSet } from '@effect-atom/atom-react';
import React, { useCallback, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { Context } from '@dxos/context';
import { Clipboard, Icon, IconButton, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { type AccountCacheInvitation, ClientCapabilities } from '#types';

import { useHubHttpClient } from '../../hooks';

export const InvitationsContainer = () => {
  const { t } = useTranslation(meta.profile.key);
  const accountCacheAtom = useCapability(ClientCapabilities.AccountCache);
  const [cache] = useAtom(accountCacheAtom);
  const setCache = useAtomSet(accountCacheAtom);
  const [pending, setPending] = useState(false);

  // Account/invitation routes live on hub-service, not the edge worker.
  const hubClient = useHubHttpClient();

  useAsyncEffect(async () => {
    if (!hubClient) {
      return;
    }

    try {
      const result = await hubClient.listAccountInvitations(new Context());
      setCache((prev) => ({ ...prev, invitations: result.invitations, fetchedAt: Date.now() }));
    } catch {
      // Offline: keep cache.
    }
  }, [hubClient, setCache]);

  const handleIssue = useCallback(async () => {
    if (!hubClient) {
      return;
    }
    setPending(true);
    try {
      const result = await hubClient.issueAccountInvitation(new Context());
      // Optimistically push the new code and decrement the remaining quota; the
      // server consumes one slot at issue time. Next refresh reconciles.
      setCache((prev) => ({
        ...prev,
        account: prev.account
          ? { ...prev.account, invitationsRemaining: Math.max(0, prev.account.invitationsRemaining - 1) }
          : prev.account,
        invitations: [{ code: result.code, createdAt: new Date().toISOString() }, ...(prev.invitations ?? [])],
      }));
    } finally {
      setPending(false);
    }
  }, [hubClient, setCache]);

  const remaining = cache.account?.invitationsRemaining ?? 0;
  const list = cache.invitations ?? [];
  const available = list.filter((row) => !row.redeemedByIdentityDid);
  const redeemed = list.filter((row) => Boolean(row.redeemedByIdentityDid));

  return (
    <Clipboard.Provider>
      <Form.Root variant='settings'>
        <Form.Viewport scroll>
          <Form.Content>
            <Form.Section title={t('invitations-section.title')} description={t('invitations-section.description')}>
              <Form.Row
                label={t('generate-invitation.label')}
                description={t('generate-invitation.description', { count: remaining })}
              >
                <IconButton
                  icon='ph--plus--regular'
                  label={t('generate-invitation.label')}
                  variant='primary'
                  onClick={handleIssue}
                  disabled={pending || remaining <= 0}
                />
              </Form.Row>
            </Form.Section>

            {available.length > 0 ? (
              <Form.Section title={t('available-invitations.title')}>
                <Listbox.Root>
                  <Listbox.Content classNames='gap-1'>
                    {available.map((row) => (
                      <AvailableInvitationItem key={row.code} row={row} />
                    ))}
                  </Listbox.Content>
                </Listbox.Root>
              </Form.Section>
            ) : null}

            {redeemed.length > 0 ? (
              <Form.Section title={t('redeemed-invitations.title')}>
                <Listbox.Root>
                  <Listbox.Content classNames='gap-1'>
                    {redeemed.map((row) => (
                      <RedeemedInvitationItem key={row.code} row={row} />
                    ))}
                  </Listbox.Content>
                </Listbox.Root>
              </Form.Section>
            ) : null}
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Clipboard.Provider>
  );
};

const AvailableInvitationItem = ({ row }: { row: AccountCacheInvitation }) => (
  <Listbox.Item id={row.code} classNames='grid grid-cols-[min-content_1fr_min-content] items-center gap-2'>
    <Icon icon='ph--paper-plane-tilt--duotone' size={5} classNames='text-description' />
    <div className='flex flex-col min-w-0'>
      <div className='font-mono truncate'>{row.code}</div>
      <p className='text-description text-xs'>{new Date(row.createdAt).toLocaleString()}</p>
    </div>
    <Clipboard.IconButton value={row.code} />
  </Listbox.Item>
);

const RedeemedInvitationItem = ({ row }: { row: AccountCacheInvitation }) => {
  const date = row.redeemedAt ?? row.createdAt;
  return (
    <Listbox.Item id={row.code} classNames='grid grid-cols-[min-content_1fr] items-center gap-2'>
      <Icon icon='ph--check-circle--duotone' size={5} classNames='text-success-text' />
      <div className='flex flex-col min-w-0'>
        <div className='font-mono truncate'>{row.code}</div>
        <p className='text-description text-xs'>{new Date(date).toLocaleString()}</p>
      </div>
    </Listbox.Item>
  );
};

InvitationsContainer.displayName = 'InvitationsContainer';
