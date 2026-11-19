//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { type AccessToken } from '@dxos/link';
import { MANAGED_ACCESS_TOKEN } from '@dxos/protocols';
import { useClient } from '@dxos/react-client';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { DebugNamespace } from '../../namespace.ts';
import { DebugRow, DebugSection } from './DebugSection.tsx';

type Health = { ok: boolean; status: number; env?: string; latencyMs: number; error?: string };

type Custody = { resolved: boolean; expiresAt?: string; error?: string };

export type AccessTokenPanelProps = { object: AccessToken.AccessToken };

/**
 * An access token's standing with KMS: the token's kind and scopes, kms-service's health, and, for a token KMS
 * holds, whether it resolves and when it expires. The token value is never shown.
 */
export const AccessTokenPanel = ({ object }: AccessTokenPanelProps) => {
  const { t } = UiHooks.useTranslation(DebugNamespace.key);
  const client = useClient();
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  const managed = object.token === MANAGED_ACCESS_TOKEN;
  const spaceId = Obj.getDatabase(object)?.spaceId;
  const [health, setHealth] = useState<Health>();
  const [custody, setCustody] = useState<Custody>();

  const refresh = useCallback(async () => {
    if (!edgeUrl) {
      return;
    }
    const started = performance.now();
    try {
      const response = await fetch(new URL('/kms/health', edgeUrl));
      const body: unknown = await response.json().catch(() => undefined);
      const data = typeof body === 'object' && body !== null && 'data' in body ? body.data : undefined;
      const env = typeof data === 'object' && data !== null && 'env' in data ? String(data.env) : undefined;
      setHealth({ ok: response.ok, status: response.status, env, latencyMs: Math.round(performance.now() - started) });
    } catch (error) {
      setHealth({ ok: false, status: 0, latencyMs: Math.round(performance.now() - started), error: String(error) });
    }
    if (managed && spaceId) {
      try {
        const result = await client.edge.http.getAccessToken(Context.default(), {
          spaceId,
          accessTokenId: object.id,
        });
        setCustody({ resolved: true, expiresAt: new Date(result.expiresAtMillis).toISOString() });
      } catch (error) {
        setCustody({ resolved: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }, [client, edgeUrl, managed, spaceId, object.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <DebugSection title={t('kms-panel.title')} onRefresh={() => void refresh()} refreshLabel={t('refresh.label')}>
      <DebugRow label={t('kms-panel.source.label')} value={object.source} />
      <DebugRow label={t('kms-panel.account.label')} value={object.account} />
      <DebugRow label={t('kms-panel.scopes.label')} value={object.scopes?.join(' ')} />
      <DebugRow
        label={t('kms-panel.custody.label')}
        value={t(managed ? 'kms-panel.managed.label' : 'kms-panel.inline.label')}
      />
      <DebugRow
        label={t('kms-panel.health.label')}
        value={
          health
            ? `${health.ok ? 'ok' : 'down'} · ${health.status || health.error} · ${health.latencyMs} ms${health.env ? ` · ${health.env}` : ''}`
            : edgeUrl
              ? undefined
              : t('kms-panel.no-edge.label')
        }
      />
      {managed && (
        <DebugRow
          label={t('kms-panel.resolve.label')}
          value={custody ? (custody.resolved ? `ok · expires ${custody.expiresAt}` : custody.error) : undefined}
        />
      )}
    </DebugSection>
  );
};
