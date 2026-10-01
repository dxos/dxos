//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Flex, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list/next';
import { Next } from '@dxos/react-ui/next';
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
  const { invokePromise } = useOperationInvoker();
  const manager = usePluginManager();

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

  const handleToggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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
    <Next.Dialog.Content>
      <Next.Dialog.Header>
        <Next.Dialog.Title>{t('sync-targets-dialog.title')}</Next.Dialog.Title>
        <Next.Dialog.CloseTrigger asChild>
          <Next.SystemButton.Close />
        </Next.Dialog.CloseTrigger>
      </Next.Dialog.Header>
      <Next.Dialog.Body>
        <Next.Dialog.Description>{t('sync-targets-dialog.description')}</Next.Dialog.Description>

        {availableTargets.length > 0 && (
          <Flex gap='sm' classNames='py-form-gap'>
            <Next.Button onClick={handleSelectAll} disabled={submitting}>
              {t('select-all.label')}
            </Next.Button>
            <Next.Button onClick={handleSelectNone} disabled={submitting}>
              {t('select-none.label')}
            </Next.Button>
          </Flex>
        )}

        {availableTargets.length === 0 ? (
          <Next.Empty>{t('no-available-targets.message')}</Next.Empty>
        ) : (
          <Next.ScrollArea.Root padding>
            <Next.ScrollArea.Viewport>
              <Listbox.Root>
                <Listbox.Content>
                  {availableTargets.map((target) => {
                    // Associate the visible label with the checkbox so clicking the name toggles it.
                    const checkboxId = `sync-target-${target.id}`;
                    return (
                      <Listbox.Item key={target.id} id={target.id}>
                        <Next.Field.Root>
                          <Listbox.ItemContent
                            icon={
                              <Next.Checkbox
                                id={checkboxId}
                                checked={selected.has(target.id)}
                                onCheckedChange={() => handleToggle(target.id)}
                                disabled={submitting}
                                aria-label={target.name}
                              />
                            }
                            title={
                              <Next.Field.Label htmlFor={checkboxId} classNames='text-base text-base-fg'>
                                {target.name}
                              </Next.Field.Label>
                            }
                            description={target.description}
                          />
                        </Next.Field.Root>
                      </Listbox.Item>
                    );
                  })}
                </Listbox.Content>
              </Listbox.Root>
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
        )}

        {error && <p className='mt-form-gap text-error-text'>{error}</p>}
      </Next.Dialog.Body>
      <Next.Dialog.Footer>
        <Next.Dialog.CloseTrigger asChild>
          <Next.Button disabled={submitting}>{t('cancel.label', { ns: osTranslations })}</Next.Button>
        </Next.Dialog.CloseTrigger>
        <Next.Button variant='primary' onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('saving.label', { ns: osTranslations }) : t('save.label', { ns: osTranslations })}
        </Next.Button>
      </Next.Dialog.Footer>
    </Next.Dialog.Content>
  );
};

SyncTargetsDialog.displayName = 'SyncTargetsDialog';
