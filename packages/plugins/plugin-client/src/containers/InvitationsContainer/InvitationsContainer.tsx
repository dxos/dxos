//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomSet } from '@effect-atom/atom-react';
import React, { useCallback, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { Context } from '@dxos/context';
import { Clipboard, Icon, IconButton, List, ListItem, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { ClientCapabilities } from '#types';

import { type AccountCacheInvitation } from '../../state/account-cache';
import { useHubHttpClient } from '../../state/use-hub-http';

export const InvitationsContainer = () => {
  const { t } = useTranslation(meta.profile.key);
  const accountCacheAtom = useCapability(ClientCapabilities.AccountCache);
  const [cache] = useAtom(accountCacheAtom);
  const setCache = useAtomSet(accountCacheAtom);
  const [pending, setPending] = useState(false);

  // Account/invitation routes live on hub-service, not the edge worker.
  const hubHttp = useHubHttpClient();

  useAsyncEffect(async () => {
    if (!hubHttp) {
      return;
    }
    try {
      const result = await hubHttp.listAccountInvitations(new Context());
      setCache((prev) => ({ ...prev, invitations: result.invitations, fetchedAt: Date.now() }));
    } catch {
      // Offline: keep cache.
    }
  }, [hubHttp, setCache]);

  const handleIssue = useCallback(async () => {
    if (!hubHttp) {
      return;
    }
    setPending(true);
    try {
      const result = await hubHttp.issueAccountInvitation(new Context());
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
  }, [hubHttp, setCache]);

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
                <List>
                  {available.map((row) => (
                    <AvailableInvitationItem key={row.code} row={row} />
                  ))}
                </List>
              </Form.Section>
            ) : null}

            {redeemed.length > 0 ? (
              <Form.Section title={t('redeemed-invitations.title')}>
                <List>
                  {redeemed.map((row) => (
                    <RedeemedInvitationItem key={row.code} row={row} />
                  ))}
                </List>
              </Form.Section>
            ) : null}
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Clipboard.Provider>
  );
};

const AvailableInvitationItem = ({ row }: { row: AccountCacheInvitation }) => (
  <ListItem.Root classNames='grid grid-cols-[min-content_1fr_min-content] items-center gap-2'>
    <ListItem.Endcap>
      <Icon icon='ph--paper-plane-tilt--duotone' size={5} classNames='text-description' />
    </ListItem.Endcap>
    <div className='flex flex-col min-w-0'>
      <ListItem.Heading classNames='font-mono truncate'>{row.code}</ListItem.Heading>
      <p className='text-description text-xs'>{new Date(row.createdAt).toLocaleString()}</p>
    </div>
    <ListItem.Endcap>
      <Clipboard.IconButton value={row.code} />
    </ListItem.Endcap>
  </ListItem.Root>
);

const RedeemedInvitationItem = ({ row }: { row: AccountCacheInvitation }) => {
  const date = row.redeemedAt ?? row.createdAt;
  return (
    <ListItem.Root classNames='grid grid-cols-[min-content_1fr] items-center gap-2'>
      <ListItem.Endcap>
        <Icon icon='ph--check-circle--duotone' size={5} classNames='text-success-text' />
      </ListItem.Endcap>
      <div className='flex flex-col min-w-0'>
        <ListItem.Heading classNames='font-mono truncate'>{row.code}</ListItem.Heading>
        <p className='text-description text-xs'>{new Date(date).toLocaleString()}</p>
      </div>
    </ListItem.Root>
  );
};
