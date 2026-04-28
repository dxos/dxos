//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomSet } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { createEdgeIdentity } from '@dxos/client/edge';
import { Context } from '@dxos/context';
import { EdgeHttpClient } from '@dxos/edge-client';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, Clipboard, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { type AccountCacheInvitation, accountCacheAtom } from '../../state/account-cache';

const formatStatus = (row: AccountCacheInvitation, t: (key: string, opts?: any) => string): string => {
  if (row.redeemedByIdentityKey) {
    return t('invitation redeemed');
  }
  return t('invitation available');
};

/**
 * Profile-page Invitations panel. Self-contained: fetches via `client.edge.http`,
 * lazily issues new codes on demand, and renders the list with copy-to-clipboard.
 */
export const InvitationsContainer = () => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const identity = useIdentity();
  const [cache] = useAtom(accountCacheAtom);
  const setCache = useAtomSet(accountCacheAtom);
  const [pending, setPending] = useState(false);

  // Hub HTTP client (account/invitation routes live on hub-service, not edge).
  const hubHttp = useMemo(() => {
    const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
    if (!hubUrl || !identity) {
      return undefined;
    }
    const httpClient = new EdgeHttpClient(hubUrl);
    httpClient.setIdentity(createEdgeIdentity(client));
    return httpClient;
  }, [client, identity]);

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
      // Optimistically push the new code; the next refresh reconciles with the server.
      setCache((prev) => ({
        ...prev,
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
        <Settings.Section title={t('invitations section title')}>
          <Settings.Item title={t('invitations remaining label')} description={String(remaining)}>
            <Button onClick={handleIssue} disabled={pending || remaining <= 0} density='fine'>
              {t('generate invitation')}
            </Button>
          </Settings.Item>

          {list.length === 0 ? (
            <Settings.Item title={t('no invitations issued')} />
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
