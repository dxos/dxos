//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Button, IconButton, Panel, useTranslation } from '@dxos/react-ui';

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

  return (
    <Panel.Root>
      <Panel.Content classNames='p-4 flex flex-col gap-4'>
        <header className='flex items-start justify-between gap-2'>
          <div className='flex flex-col gap-1'>
            <div className='text-lg font-medium'>
              {subject.name ?? accessToken?.account ?? accessToken?.source ?? ''}
            </div>
            {accessToken && (
              <div className='text-xs text-subdued'>
                {accessToken.source}
                {accessToken.account ? ` · ${accessToken.account}` : ''}
              </div>
            )}
          </div>
          <div className='flex gap-1 shrink-0'>
            {syncAvailable && (
              <IconButton
                icon='ph--arrows-clockwise--regular'
                iconOnly
                disabled={syncing || !hasTargets}
                label={t('sync-now.label', { defaultValue: 'Sync now' })}
                onClick={() => void sync()}
              />
            )}
            <IconButton
              icon='ph--trash--regular'
              iconOnly
              variant='ghost'
              label={t('delete-integration.label', { defaultValue: 'Delete integration' })}
              onClick={handleDelete}
            />
          </div>
        </header>

        {syncError && <div className='text-xs text-error'>{syncError}</div>}

        <section className='flex flex-col gap-1'>
          <div className='flex items-center justify-between'>
            <h3 className='text-sm font-medium'>{t('targets.label', { defaultValue: 'Sync targets' })}</h3>
            <Button onClick={openChecklist} disabled={!syncTargetsAvailable || loading}>
              {loading
                ? t('loading.label', { defaultValue: 'Loading…' })
                : t('change-targets.label', { defaultValue: 'Change sync targets' })}
            </Button>
          </div>
          {error && <div className='text-xs text-error'>{error}</div>}
          {!provider && (
            <div className='text-xs text-subdued'>
              {t('no-provider.message', {
                defaultValue: 'No service plugin is registered for this integration.',
              })}
            </div>
          )}
          {provider && !syncTargetsAvailable && (
            <div className='text-xs text-subdued'>
              {t('no-sync-support.message', {
                defaultValue: 'Sync targets aren’t supported by this integration yet.',
              })}
            </div>
          )}
          {!hasTargets ? (
            <div className='text-xs text-subdued'>
              {t('no-targets.message', {
                defaultValue: 'No targets selected. Click "Change sync targets" to choose.',
              })}
            </div>
          ) : (
            <ul className='flex flex-col gap-1'>
              {subject.targets.map((target, idx) => {
                const obj = target.object.target;
                const label = obj ? (obj as any).name ?? Obj.getDXN(obj).toString() : '(unresolved)';
                return (
                  <li key={idx} className='flex flex-col p-2 border rounded'>
                    <div className='text-sm'>{label}</div>
                    <div className='text-xs text-subdued'>
                      {target.lastSyncAt
                        ? `${t('last-sync.label', { defaultValue: 'Last synced' })}: ${new Date(target.lastSyncAt).toLocaleString()}`
                        : t('never-synced.label', { defaultValue: 'Never synced' })}
                    </div>
                    {target.lastError && <div className='text-xs text-error'>{target.lastError}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Panel.Content>
    </Panel.Root>
  );
};
