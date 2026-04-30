//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { useSyncIntegration, useSyncTargetsChecklist } from '#hooks';
import { meta } from '#meta';

import { useIntegrationProvider } from '../../capabilities/integration-provider';
import { type Integration } from '../../types';

export type IntegrationArticleProps = AppSurface.ObjectArticleProps<Integration.Integration>;

export const IntegrationArticle = ({ subject }: IntegrationArticleProps) => {
  const { t } = useTranslation(meta.id);
  const accessToken = subject.accessToken.target;
  const provider = useIntegrationProvider(accessToken?.source);
  const { available: syncTargetsAvailable, loading, error, openChecklist } = useSyncTargetsChecklist(subject);
  const { available: syncAvailable, syncing, error: syncError, sync } = useSyncIntegration(subject);

  // Delete the integration object. The wrapped AccessToken is a child of
  // this Integration (reparented at create time) so removal cascades.
  const handleDelete = useCallback(() => {
    const db = Obj.getDatabase(subject);
    if (!db) return;
    db.remove(subject);
  }, [subject]);

  const hasTargets = (subject.targets ?? []).length > 0;
  const sourceLine = accessToken
    ? `${accessToken.source}${accessToken.account ? ` · ${accessToken.account}` : ''}`
    : undefined;
  const headerTitle = subject.name ?? accessToken?.account ?? accessToken?.source ?? '';

  return (
    <Settings.Viewport>
      <Settings.Section title={headerTitle} description={sourceLine}>
        {!provider && (
          <Settings.Panel>
            <p className='text-description'>
              {t('no-provider.message', {
                defaultValue: 'No service plugin is registered for this integration.',
              })}
            </p>
          </Settings.Panel>
        )}

        <Settings.Item
          title={t('sync-now.label', { defaultValue: 'Sync now' })}
          description={t('sync-now.description', {
            defaultValue: 'Reconcile cards with the remote service.',
          })}
        >
          <Button onClick={() => void sync()} disabled={!syncAvailable || syncing || !hasTargets}>
            {syncing
              ? t('syncing.label', { defaultValue: 'Syncing…' })
              : t('sync-now.label', { defaultValue: 'Sync now' })}
          </Button>
        </Settings.Item>

        <Settings.Item
          title={t('change-targets.label', { defaultValue: 'Change sync targets' })}
          description={t('change-targets.description', {
            defaultValue: 'Pick which remote items this integration syncs into the space.',
          })}
        >
          <Button onClick={openChecklist} disabled={!syncTargetsAvailable || loading}>
            {loading
              ? t('loading.label', { defaultValue: 'Loading…' })
              : t('change-targets.label', { defaultValue: 'Change sync targets' })}
          </Button>
        </Settings.Item>

        <Settings.Item
          title={t('delete-integration.label', { defaultValue: 'Delete integration' })}
          description={t('delete-integration.description', {
            defaultValue: 'Removes the integration and its access token. Synced objects remain in the space.',
          })}
        >
          <Button variant='destructive' onClick={handleDelete}>
            {t('delete-integration.label', { defaultValue: 'Delete' })}
          </Button>
        </Settings.Item>

        {(syncError || error) && (
          <Settings.Panel>
            <p className='text-error'>{syncError ?? error}</p>
          </Settings.Panel>
        )}
      </Settings.Section>

      <Settings.Section title={t('targets.label', { defaultValue: 'Sync targets' })}>
        <Settings.Panel>
          {!hasTargets ? (
            <p className='text-description'>
              {t('no-targets.message', {
                defaultValue: 'No targets selected. Click "Change sync targets" to choose.',
              })}
            </p>
          ) : (
            <ul className='flex flex-col gap-2'>
              {subject.targets.map((target, idx) => {
                const obj = target.object.target;
                const label = obj ? ((obj as any).name ?? Obj.getDXN(obj).toString()) : '(unresolved)';
                return (
                  <li key={idx} className='flex flex-col'>
                    <span className='text-base'>{label}</span>
                    <span className='text-description text-sm'>
                      {target.lastSyncAt
                        ? `${t('last-sync.label', { defaultValue: 'Last synced' })}: ${new Date(target.lastSyncAt).toLocaleString()}`
                        : t('never-synced.label', { defaultValue: 'Never synced' })}
                    </span>
                    {target.lastError && <span className='text-error text-sm'>{target.lastError}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Settings.Panel>
      </Settings.Section>
    </Settings.Viewport>
  );
};
