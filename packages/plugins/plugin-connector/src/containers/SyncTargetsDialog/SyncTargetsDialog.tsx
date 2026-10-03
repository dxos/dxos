//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Button, Dialog, Empty, Flex, Listbox, ScrollArea, SystemButton, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';
import { ConnectorCoordination, ConnectorSpec } from '#types';

import * as Binding from '../../Binding.ts';

export type SyncTargetsDialogProps = {
  connection: Connection.Connection;
  availableTargets: ReadonlyArray<ConnectorSpec.RemoteTarget>;
  /** Existing local object to attach to the first newly-selected target. */
  existingTarget?: Ref.Ref<Obj.Unknown>;
};

/**
 * Dialog body for picking which remote targets are synced into a {@link Connection}.
 * On submit it reconciles the connection's external-sync cursors through
 * the {@link ConnectorCoordination.ConnectorCoordinator}.
 */
export const SyncTargetsDialog = ({ connection, availableTargets, existingTarget }: SyncTargetsDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const manager = PluginManagerProvider.usePluginManager();

  const db = Obj.getDatabase(connection);
  const allCursors = useQuery(db, Filter.type(Cursor.Cursor));
  const initiallySelected = useMemo(() => {
    const ids = new Set<string>();
    for (const cursor of allCursors) {
      if (Binding.isForConnection(cursor, connection) && cursor.spec.externalId) {
        ids.add(cursor.spec.externalId);
      }
    }
    return ids;
  }, [allCursors, connection]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(initiallySelected));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const targetItems = useMemo(
    () => availableTargets.map((target) => ({ value: target.id, label: target.name, description: target.description })),
    [availableTargets],
  );

  const handleSelectAll = useCallback(() => {
    setSelected(new Set(availableTargets.map((target) => target.id)));
  }, [availableTargets]);

  const handleSelectNone = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!db) {
      setError('No database for connection.');
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const chosen = availableTargets
        .filter((target) => selected.has(target.id))
        .map((target) => ({ externalId: target.id, name: target.name }));
      const coordinator = manager.capabilities.get(ConnectorCoordination.ConnectorCoordinator);
      await EffectEx.runAndForwardErrors(
        coordinator.setCursors({
          db,
          connection: Ref.make(connection),
          selected: chosen,
          existingTarget,
        }),
      );
      void invokePromise(LayoutOperation.UpdateDialog, { state: false });
    } catch (err) {
      log.catch(err);
      setError(String((err as Error).message ?? err));
    } finally {
      setSubmitting(false);
    }
  }, [availableTargets, selected, connection, db, existingTarget, manager, invokePromise]);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('sync-targets-dialog.title')}</Dialog.Title>
        <Dialog.CloseTrigger asChild>
          <SystemButton.Close />
        </Dialog.CloseTrigger>
      </Dialog.Header>
      <Dialog.Body>
        <Dialog.Description>{t('sync-targets-dialog.description')}</Dialog.Description>

        {availableTargets.length > 0 && (
          <Flex gap='sm' classNames='py-form-gap'>
            <Button onClick={handleSelectAll} disabled={submitting}>
              {t('select-all.label')}
            </Button>
            <Button onClick={handleSelectNone} disabled={submitting}>
              {t('select-none.label')}
            </Button>
          </Flex>
        )}

        {availableTargets.length === 0 ? (
          <Empty>{t('no-available-targets.message')}</Empty>
        ) : (
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              {/* A multiple-selection listbox: each row toggles its target and shows a check while selected. */}
              <Listbox.Root
                items={targetItems}
                selectionMode='multiple'
                value={[...selected]}
                onValueChange={(value) => setSelected(new Set(value))}
                disabled={submitting}
              >
                <Listbox.Content aria-label={t('sync-targets-dialog.title')}>
                  {targetItems.map((item) => (
                    <Listbox.Item key={item.value} item={item}>
                      <Listbox.ItemIndicator />
                      <Listbox.ItemText />
                      {item.description && <Listbox.ItemDescription />}
                    </Listbox.Item>
                  ))}
                </Listbox.Content>
              </Listbox.Root>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}

        {error && <p className='mt-form-gap text-error-text'>{error}</p>}
      </Dialog.Body>
      <Dialog.Footer>
        <Dialog.CloseTrigger asChild>
          <Button disabled={submitting}>{t('cancel.label', { ns: osTranslations })}</Button>
        </Dialog.CloseTrigger>
        <Button variant='primary' onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('saving.label', { ns: osTranslations }) : t('save.label', { ns: osTranslations })}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  );
};

SyncTargetsDialog.displayName = 'SyncTargetsDialog';
