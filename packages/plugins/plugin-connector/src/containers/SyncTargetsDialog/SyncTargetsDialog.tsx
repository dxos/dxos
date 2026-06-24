//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Dialog, Input, List, ListItem, ScrollArea, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';
import { ConnectorCoordinator, type RemoteTarget } from '#types';

import { type Connection, SyncBinding } from '../../types';

export type SyncTargetsDialogProps = {
  connection: Connection.Connection;
  availableTargets: ReadonlyArray<RemoteTarget>;
  /** Existing local object to attach to the first newly-selected target. */
  existingTarget?: Ref.Ref<Obj.Unknown>;
};

/**
 * Dialog body for picking which remote targets are synced into a {@link Connection}.
 * On submit it reconciles the connection's {@link SyncBinding} relations through
 * the {@link ConnectorCoordinator}.
 */
export const SyncTargetsDialog = ({ connection, availableTargets, existingTarget }: SyncTargetsDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const manager = usePluginManager();

  const db = Obj.getDatabase(connection);
  const bindings = useQuery(db, Query.select(Filter.id(connection.id)).sourceOf(SyncBinding.SyncBinding));
  const initiallySelected = useMemo(() => {
    const ids = new Set<string>();
    for (const binding of bindings) {
      if (binding.remoteId) {
        ids.add(binding.remoteId);
      }
    }
    return ids;
  }, [bindings]);

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
        .map((target) => ({ remoteId: target.id, name: target.name }));
      const coordinator = manager.capabilities.get(ConnectorCoordinator);
      await EffectEx.runAndForwardErrors(
        coordinator.setSyncBindings({
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
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <Dialog.Description>{t('sync-targets-dialog.description')}</Dialog.Description>

        {availableTargets.length > 0 && (
          <div className='flex gap-2 py-form-gap'>
            <Button onClick={handleSelectAll} disabled={submitting}>
              {t('select-all.label')}
            </Button>
            <Button onClick={handleSelectNone} disabled={submitting}>
              {t('select-none.label')}
            </Button>
          </div>
        )}

        {availableTargets.length === 0 ? (
          <p className='mt-form-gap text-description'>{t('no-available-targets.message')}</p>
        ) : (
          <ScrollArea.Root classNames='my-4' padding>
            <ScrollArea.Viewport>
              <List classNames='flex flex-col gap-1'>
                {availableTargets.map((target) => {
                  // Associate the visible label with the checkbox so clicking the name toggles it.
                  const checkboxId = `sync-target-${target.id}`;
                  return (
                    <ListItem.Root key={target.id} classNames='gap-1'>
                      <Input.Root>
                        <ListItem.Endcap>
                          <Input.Checkbox
                            id={checkboxId}
                            checked={selected.has(target.id)}
                            onCheckedChange={() => handleToggle(target.id)}
                            disabled={submitting}
                            aria-label={target.name}
                          />
                        </ListItem.Endcap>
                        <div>
                          <Input.Label htmlFor={checkboxId} classNames='pt-1 text-base text-base-text'>
                            {target.name}
                          </Input.Label>
                          {target.description && <p className='text-description text-sm'>{target.description}</p>}
                        </div>
                      </Input.Root>
                    </ListItem.Root>
                  );
                })}
              </List>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}

        {error && <p className='mt-form-gap text-error-text'>{error}</p>}
      </Dialog.Body>
      <Dialog.ActionBar>
        <Dialog.Close asChild>
          <Button disabled={submitting}>{t('cancel.label', { ns: osTranslations })}</Button>
        </Dialog.Close>
        <Button variant='primary' onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('saving.label', { ns: osTranslations }) : t('save.label', { ns: osTranslations })}
        </Button>
      </Dialog.ActionBar>
    </Dialog.Content>
  );
};
