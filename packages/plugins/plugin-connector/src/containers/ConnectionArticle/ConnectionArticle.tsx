//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { useConnector, useSyncConnection, useSyncTargetsChecklist } from '#hooks';
import { meta } from '#meta';

import { type Connection, SyncBinding } from '../../types';

export type ConnectionArticleProps = AppSurface.ObjectArticleProps<Connection.Connection>;

export const ConnectionArticle = ({ subject }: ConnectionArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Snapshot drives reactive display; the live `subject` is handed to hooks that need an entity.
  const [connection] = useObject(subject);
  const [accessToken] = useObject(subject.accessToken);
  const connector = useConnector(connection?.connectorId);
  const db = Obj.getDatabase(subject);
  const bindings = useQuery(db, Query.select(Filter.id(subject.id)).sourceOf(SyncBinding.SyncBinding));
  const { invokePromise } = useOperationInvoker();

  const { available: syncTargetsAvailable, loading, openChecklist } = useSyncTargetsChecklist(subject);
  const { available: syncAvailable, bindingCount, syncing, sync } = useSyncConnection(subject);

  const handleDelete = useCallback(() => {
    void invokePromise(SpaceOperation.RemoveObjects, { objects: [subject] });
  }, [invokePromise, subject]);

  const handleRemoveBinding = useCallback(
    (binding: SyncBinding.SyncBinding) => {
      void invokePromise(SpaceOperation.RemoveObjects, { objects: [binding] });
    },
    [invokePromise],
  );

  const connectorLabel = connector?.label ?? connector?.id ?? connection?.connectorId;
  const account = accessToken?.account;
  const headerTitle = connection?.name ?? account ?? connectorLabel ?? '';
  const sourceLine = connectorLabel
    ? `${connectorLabel}${account ? ` · ${account}` : ''}`
    : (accessToken?.source ?? undefined);

  return (
    <Settings.Viewport>
      <Settings.Section title={headerTitle} description={sourceLine}>
        {!connector && (
          <Settings.Panel>
            <p className='text-description'>
              {t('no-connector.message', {
                defaultValue: 'No service plugin is registered for this connection.',
              })}
            </p>
          </Settings.Panel>
        )}

        {/* Hide Sync now entirely when the connector has no `sync` op. */}
        {syncAvailable && (
          <Settings.Item
            title={t('sync-now.label', { defaultValue: 'Sync now' })}
            description={t('sync-now.description', {
              defaultValue: 'Reconcile cards with the remote service.',
            })}
          >
            <Button onClick={() => void sync()} disabled={syncing || bindingCount === 0}>
              {syncing
                ? t('syncing.label', { defaultValue: 'Syncing…' })
                : t('sync-now.label', { defaultValue: 'Sync now' })}
            </Button>
          </Settings.Item>
        )}

        {/* Only show change-targets for connectors that support user-pickable targets. */}
        {connector?.getSyncTargets && (
          <Settings.Item
            title={t('change-targets.label', { defaultValue: 'Change sync targets' })}
            description={t('change-targets.description', {
              defaultValue: 'Pick which remote items this connection syncs into the space.',
            })}
          >
            <Button onClick={openChecklist} disabled={!syncTargetsAvailable || loading}>
              {loading
                ? t('loading.label', { defaultValue: 'Loading…' })
                : t('change-targets.label', { defaultValue: 'Change sync targets' })}
            </Button>
          </Settings.Item>
        )}

        <Settings.Item
          title={t('delete-connection.label', { defaultValue: 'Delete connection' })}
          description={t('delete-connection.description', {
            defaultValue: 'Remove this connection and its sync bindings.',
          })}
        >
          <Button onClick={handleDelete}>{t('delete-connection.label', { defaultValue: 'Delete connection' })}</Button>
        </Settings.Item>
      </Settings.Section>

      {/* Hide the sync-targets section for connectors that don't sync. */}
      {connector?.sync && (
        <Settings.Section title={t('targets.label', { defaultValue: 'Sync targets' })}>
          {bindings.length === 0 ? (
            <Settings.Panel>
              <p className='text-description'>
                {connector?.getSyncTargets
                  ? t('no-targets.message', {
                      defaultValue: 'No targets selected. Click "Change sync targets" to choose.',
                    })
                  : t('no-targets-yet.message', {
                      defaultValue: 'No targets yet — finish OAuth to set up the default target.',
                    })}
              </p>
            </Settings.Panel>
          ) : (
            bindings.map((binding) => (
              <BindingRow key={binding.id} binding={binding} onRemove={handleRemoveBinding} />
            ))
          )}
        </Settings.Section>
      )}
    </Settings.Viewport>
  );
};

/**
 * One row in the sync-bindings list. Renders the binding's name + sync status.
 * When the binding's target object has been deleted, the row surfaces that
 * state and offers to remove the now-orphaned binding (relations don't
 * cascade-delete, so a target deleted elsewhere leaves a dangling binding).
 */
const BindingRow = ({
  binding,
  onRemove,
}: {
  binding: SyncBinding.SyncBinding;
  onRemove: (binding: SyncBinding.SyncBinding) => void;
}) => {
  const { t } = useTranslation(meta.profile.key);
  // Resolving the relation endpoint can throw if the target reference is
  // entirely unresolvable; treat that the same as a deleted target.
  const target = useMemo(() => {
    try {
      return Relation.getTarget(binding);
    } catch {
      return undefined;
    }
  }, [binding]);
  const [resolvedTarget] = useObject(target);
  const missing = !resolvedTarget || Obj.isDeleted(resolvedTarget);
  // Label precedence: explicit binding name → remote id → the target's own
  // label → its type's translated label (single-target connectors leave a
  // binding without a name/remoteId, e.g. Gmail's Mailbox). Sync status lives
  // on the line below, so the label must never describe sync progress.
  const targetTypename = resolvedTarget ? Obj.getTypename(resolvedTarget) : undefined;
  const label =
    binding.name ??
    binding.remoteId ??
    (resolvedTarget ? Obj.getLabel(resolvedTarget) : undefined) ??
    (targetTypename ? t('typename.label', { ns: targetTypename, defaultValue: targetTypename }) : undefined) ??
    t('sync-target.label', { defaultValue: 'Sync target' });

  return (
    <Settings.Panel>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex flex-col gap-1'>
          <span className='text-base'>{label}</span>
          {missing ? (
            <span className='text-error text-sm'>
              {t('binding-target-missing.message', {
                defaultValue: 'Synced object was deleted. Remove this binding to clean it up.',
              })}
            </span>
          ) : (
            <span className='text-description text-sm'>
              {binding.lastSyncAt
                ? `${t('last-sync.label', { defaultValue: 'Last synced' })}: ${new Date(binding.lastSyncAt).toLocaleString()}`
                : t('never-synced.label', { defaultValue: 'Never synced' })}
            </span>
          )}
          {!missing && binding.lastError && <span className='text-error text-sm'>{binding.lastError}</span>}
        </div>
        {missing && (
          <Button onClick={() => onRemove(binding)}>
            {t('remove-binding.label', { defaultValue: 'Remove binding' })}
          </Button>
        )}
      </div>
    </Settings.Panel>
  );
};
