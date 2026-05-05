//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomSet } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useState } from 'react';

import { Context } from '@dxos/context';
import { Clipboard, Icon, IconButton, List, ListItem, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { type AccountCacheInvitation, accountCacheAtom } from '../../state/account-cache';
import { useHubHttpClient } from '../../state/use-hub-http';

export const InvitationsContainer = () => {
  const { t } = useTranslation(meta.id);
  const [cache] = useAtom(accountCacheAtom);
  const setCache = useAtomSet(accountCacheAtom);
  const [pending, setPending] = useState(false);

  // Account/invitation routes live on hub-service, not the edge worker.
  const hubHttp = useHubHttpClient();

  useEffect(() => {
    if (!hubHttp) {
      return;
    }
    let cancelled = false;
    hubHttp
      .listAccountInvitations(new Context())
      .then((result) => {
        if (cancelled) {
          return;
        }
        setCache((prev) => ({ ...prev, invitations: result.invitations, fetchedAt: Date.now() }));
      })
      .catch(() => {
        // Offline: keep cache.
      });
    return () => {
      cancelled = true;
    };
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
  const available = list.filter((row) => !row.redeemedByIdentityKey);
  const redeemed = list.filter((row) => Boolean(row.redeemedByIdentityKey));

  return (
    <Clipboard.Provider>
      <Settings.Viewport>
        <Settings.Section title={t('invitations-section.title')} description={t('invitations-section.description')}>
          <Settings.Item
            title={t('generate-invitation.label')}
            description={t('generate-invitation.description', { count: remaining })}
          >
            <IconButton
              icon='ph--plus--regular'
              label={t('generate-invitation.label')}
              variant='primary'
              onClick={handleIssue}
              disabled={pending || remaining <= 0}
            />
          </Settings.Item>
        </Settings.Section>

        {available.length > 0 ? (
          <Settings.Section title={t('available-invitations.title')}>
            <List>
              {available.map((row) => (
                <AvailableInvitationItem key={row.code} row={row} />
              ))}
            </List>
          </Settings.Section>
        ) : null}

        {redeemed.length > 0 ? (
          <Settings.Section title={t('redeemed-invitations.title')}>
            <List>
              {redeemed.map((row) => (
                <RedeemedInvitationItem key={row.code} row={row} />
              ))}
            </List>
          </Settings.Section>
        ) : null}
      </Settings.Viewport>
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
