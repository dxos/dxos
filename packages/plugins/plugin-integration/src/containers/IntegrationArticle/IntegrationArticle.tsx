//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Form, Settings } from '@dxos/react-ui-form';

import { useSyncIntegration, useSyncTargetsChecklist } from '#hooks';
import { meta } from '#meta';

import { useIntegrationProviderById } from '../../capabilities/integration-provider';
import { type Integration } from '../../types';

export type IntegrationArticleProps = AppSurface.ObjectArticleProps<Integration.Integration>;

export const IntegrationArticle = ({ subject }: IntegrationArticleProps) => {
  const { t } = useTranslation(meta.id);
  useObject(subject);
  const accessToken = subject.accessToken.target;
  const provider = useIntegrationProviderById(subject.providerId);
  const { available: syncTargetsAvailable, loading, openChecklist } = useSyncTargetsChecklist(subject);
  const { available: syncAvailable, syncing, sync } = useSyncIntegration(subject);

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

        {/* Hide Sync now entirely when the provider has no `sync` op.
            Mirrors how Change sync targets is gated on `getSyncTargets` —
            integrations without sync support shouldn't show a phantom
            disabled button. */}
        {syncAvailable && (
          <Settings.Item
            title={t('sync-now.label', { defaultValue: 'Sync now' })}
            description={t('sync-now.description', {
              defaultValue: 'Reconcile cards with the remote service.',
            })}
          >
            <Button onClick={() => void sync()} disabled={syncing || !hasTargets}>
              {syncing
                ? t('syncing.label', { defaultValue: 'Syncing…' })
                : t('sync-now.label', { defaultValue: 'Sync now' })}
            </Button>
          </Settings.Item>
        )}

        {/* Only show the change-targets row when the provider supports
            user-pickable targets. For single-target providers (Mail) the
            target is hardcoded at create time and there's nothing to pick. */}
        {provider?.getSyncTargets && (
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
        )}

      </Settings.Section>

      <Settings.Section title={t('targets.label', { defaultValue: 'Sync targets' })}>
        {!hasTargets ? (
          <Settings.Panel>
            <p className='text-description'>
              {provider?.getSyncTargets
                ? t('no-targets.message', {
                    defaultValue: 'No targets selected. Click "Change sync targets" to choose.',
                  })
                : t('no-targets-yet.message', {
                    defaultValue: 'No targets yet — finish OAuth to set up the default target.',
                  })}
            </p>
          </Settings.Panel>
        ) : (
          subject.targets.map((_target, idx) => (
            <TargetRow
              key={idx}
              integration={subject}
              targetIndex={idx}
              optionsSchema={provider?.optionsSchema}
            />
          ))
        )}
      </Settings.Section>
    </Settings.Viewport>
  );
};

/**
 * One row in the sync-targets list. Renders the target's name + sync status
 * and — when the integration's provider declared an `optionsSchema` — an
 * inline form that edits `target.options`.
 */
const TargetRow = ({
  integration,
  targetIndex,
  optionsSchema,
}: {
  integration: Integration.Integration;
  targetIndex: number;
  optionsSchema?: Schema.Schema<any, any>;
}) => {
  const { t } = useTranslation(meta.id);
  const target = integration.targets[targetIndex];
  const obj = target?.object?.target;
  const label = obj
    ? ((obj as any).name ?? Obj.getDXN(obj).toString())
    : (target?.name ?? t('pending-sync.label', { defaultValue: 'Pending first sync…' }));

  // Stable default-values reference so Form.Root doesn't reinitialize on
  // every render. Recomputed when the target's options change in the db
  // (different identity).
  const defaultValues = useMemo(() => ({ ...(target?.options ?? {}) }), [target?.options]);

  const handleValuesChanged = useCallback(
    (values: Record<string, unknown>) => {
      Obj.change(integration, (mutable) => {
        const m = mutable as Obj.Mutable<typeof mutable>;
        const next = [...m.targets];
        if (!next[targetIndex]) return;
        next[targetIndex] = { ...next[targetIndex], options: { ...values } };
        m.targets = next;
      });
    },
    [integration, targetIndex],
  );

  if (!target) return null;

  return (
    <Settings.Panel>
      <div className='flex flex-col gap-1'>
        <span className='text-base'>{label}</span>
        <span className='text-description text-sm'>
          {target.lastSyncAt
            ? `${t('last-sync.label', { defaultValue: 'Last synced' })}: ${new Date(target.lastSyncAt).toLocaleString()}`
            : t('never-synced.label', { defaultValue: 'Never synced' })}
        </span>
        {target.lastError && <span className='text-error text-sm'>{target.lastError}</span>}
      </div>
      {optionsSchema && (
        <Form.Root
          key={targetIndex}
          schema={optionsSchema as any}
          defaultValues={defaultValues}
          onValuesChanged={handleValuesChanged}
        >
          <Form.FieldSet />
        </Form.Root>
      )}
    </Settings.Panel>
  );
};
