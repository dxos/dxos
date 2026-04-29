//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Panel, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { useIntegrationProvider, type RemoteTarget } from '../../capabilities/integration-provider';
import { type Integration } from '../../types';
import { SyncTargetsChecklist } from '../SyncTargetsChecklist';

export type IntegrationArticleProps = AppSurface.ObjectArticleProps<Integration.Integration>;

export const IntegrationArticle = ({ subject }: IntegrationArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const accessToken = subject.accessToken.target;
  const provider = useIntegrationProvider(accessToken?.source);

  const [checklistOpen, setChecklistOpen] = useState(false);
  const [availableTargets, setAvailableTargets] = useState<readonly RemoteTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleOpenChecklist = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    setError(undefined);
    try {
      const result = (await invokePromise(provider.getSyncTargets as any, {
        integration: Ref.make(subject),
      })) as { targets: readonly RemoteTarget[] };
      setAvailableTargets(result.targets);
      setChecklistOpen(true);
    } catch (err) {
      log.catch(err);
      setError(String((err as Error).message ?? err));
    } finally {
      setLoading(false);
    }
  }, [provider, subject, invokePromise]);

  return (
    <Panel.Root>
      <Panel.Content classNames='p-4 flex flex-col gap-4'>
        <header className='flex flex-col gap-1'>
          <div className='text-lg font-medium'>{subject.name ?? accessToken?.account ?? accessToken?.source ?? ''}</div>
          {accessToken && (
            <div className='text-xs text-subdued'>
              {accessToken.source}
              {accessToken.account ? ` · ${accessToken.account}` : ''}
            </div>
          )}
        </header>

        <section className='flex flex-col gap-1'>
          <div className='flex items-center justify-between'>
            <h3 className='text-sm font-medium'>{t('targets.label', { defaultValue: 'Sync targets' })}</h3>
            <button
              type='button'
              onClick={handleOpenChecklist}
              disabled={!provider || loading}
              className='text-sm px-2 py-1 border rounded'
            >
              {loading
                ? t('loading.label', { defaultValue: 'Loading…' })
                : t('change targets.label', { defaultValue: 'Change sync targets' })}
            </button>
          </div>
          {error && <div className='text-xs text-error'>{error}</div>}
          {!provider && (
            <div className='text-xs text-subdued'>
              {t('no provider.message', {
                defaultValue: 'No service plugin is registered for this integration.',
              })}
            </div>
          )}
          {(subject.targets ?? []).length === 0 ? (
            <div className='text-xs text-subdued'>
              {t('no targets.message', {
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
                        ? `${t('last sync.label', { defaultValue: 'Last synced' })}: ${new Date(target.lastSyncAt).toLocaleString()}`
                        : t('never synced.label', { defaultValue: 'Never synced' })}
                    </div>
                    {target.lastError && <div className='text-xs text-error'>{target.lastError}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Panel.Content>

      {checklistOpen && provider && (
        <SyncTargetsChecklist
          integration={subject}
          availableTargets={availableTargets}
          onClose={() => setChecklistOpen(false)}
        />
      )}
    </Panel.Root>
  );
};
