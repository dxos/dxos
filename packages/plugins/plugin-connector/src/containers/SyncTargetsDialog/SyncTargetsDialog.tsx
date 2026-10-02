//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Listbox } from '@dxos/react-ui-list';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Field from '@dxos/react-ui/Field';
import * as Flex from '@dxos/react-ui/Flex';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
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
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { invokePromise } = AppHooks.useOperationInvoker();
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
          <Flex.Root gap='sm' classNames='py-form-gap'>
            <Button.Root onClick={handleSelectAll} disabled={submitting}>
              {t('select-all.label')}
            </Button.Root>
            <Button.Root onClick={handleSelectNone} disabled={submitting}>
              {t('select-none.label')}
            </Button.Root>
          </Flex.Root>
        )}

        {availableTargets.length === 0 ? (
          <Banner.Empty label={t('no-available-targets.message')} />
        ) : (
          <ScrollArea.Root padding>
            <ScrollArea.Viewport>
              <Listbox.Root>
                <Listbox.Content>
                  {availableTargets.map((target) => {
                    // Associate the visible label with the checkbox so clicking the name toggles it.
                    const checkboxId = `sync-target-${target.id}`;
                    return (
                      <Listbox.Item key={target.id} id={target.id}>
                        <Field.Root>
                          <Listbox.ItemContent
                            icon={
                              <Field.Checkbox
                                id={checkboxId}
                                checked={selected.has(target.id)}
                                onCheckedChange={() => handleToggle(target.id)}
                                disabled={submitting}
                                aria-label={target.name}
                              />
                            }
                            title={
                              <Field.Label htmlFor={checkboxId} classNames='text-base text-base-fg'>
                                {target.name}
                              </Field.Label>
                            }
                            description={target.description}
                          />
                        </Field.Root>
                      </Listbox.Item>
                    );
                  })}
                </Listbox.Content>
              </Listbox.Root>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}

        {error && <p className='mt-form-gap text-error-text'>{error}</p>}
      </Dialog.Body>
      <Dialog.ActionBar>
        <Dialog.Close asChild>
          <Button.Root disabled={submitting}>{t('cancel.label', { ns: osTranslations })}</Button.Root>
        </Dialog.Close>
        <Button.Root variant='primary' onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('saving.label', { ns: osTranslations }) : t('save.label', { ns: osTranslations })}
        </Button.Root>
      </Dialog.ActionBar>
    </Dialog.Content>
  );
};

SyncTargetsDialog.displayName = 'SyncTargetsDialog';
