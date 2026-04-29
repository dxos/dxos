//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomSet } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useState } from 'react';

import { Context } from '@dxos/context';
import { Button, Clipboard, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { type AccountCacheInvitation, accountCacheAtom } from '../../state/account-cache';
import { useHubHttpClient } from '../../state/use-hub-http';

const formatStatus = (row: AccountCacheInvitation, t: (key: string, opts?: any) => string): string => {
  if (row.redeemedByIdentityKey) {
    return t('invitation-redeemed.label');
  }
  return t('invitation-available.label');
};

/**
 * Profile-page Invitations panel. Self-contained: fetches via `client.edge.http`,
 * lazily issues new codes on demand, and renders the list with copy-to-clipboard.
 */
export const InvitationsContainer = () => {
  const { t } = useTranslation(meta.id);
  const [cache] = useAtom(accountCacheAtom);
  const setCache = useAtomSet(accountCacheAtom);
  const [pending, setPending] = useState(false);

  // Shared hub HTTP client (see `useHubHttpClient`). Account/invitation
  // routes live on hub-service, not the edge worker.
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
      // Optimistically push the new code and decrement the remaining quota --
      // the server consumes one invitation slot at issue time. The next
      // refresh reconciles with authoritative state.
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

  return (
    <Clipboard.Provider>
      <Settings.Viewport>
        <Settings.Section title={t('invitations-section.title')}>
          <Settings.Item title={t('invitations-remaining.label')} description={String(remaining)}>
            <Button onClick={handleIssue} disabled={pending || remaining <= 0} density='fine'>
              {t('generate-invitation.label')}
            </Button>
          </Settings.Item>

          {list.length === 0 ? (
            <Settings.Item title={t('no-invitations.title')} />
          ) : (
            list.map((row) => (
              <Settings.Item
                key={row.code}
                title={row.code}
                description={`${formatStatus(row, t)} · ${new Date(row.createdAt).toLocaleString()}`}
              >
                {!row.redeemedByIdentityKey ? <Clipboard.IconButton value={row.code} /> : null}
              </Settings.Item>
            ))
          )}
        </Settings.Section>
      </Settings.Viewport>
    </Clipboard.Provider>
  );
};
