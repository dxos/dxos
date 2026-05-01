//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Button, Dialog, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { type RemoteTarget } from '../../capabilities/integration-provider';
import { SetIntegrationTargets } from '../../operations/definitions';
import { type Integration } from '../../types';

export type SyncTargetsChecklistProps = {
  integration: Integration.Integration;
  availableTargets: ReadonlyArray<RemoteTarget>;
};

/**
 * Dialog body for picking which remote targets are synced into an Integration.
 *
 * Pre-checks any rows whose `id` (foreign id) is already recorded on the
 * Integration as a target's `remoteId`. On submit invokes the generic
 * `SetIntegrationTargets` op with `{ remoteId, name }` entries — no local
 * objects are created here. The provider's `sync` op materializes local
 * placeholders on first run for each newly-selected target.
 *
 * Rendered as `Dialog.Content` inside the layout system's surrounding
 * `Dialog.Root` + `Dialog.Overlay` — opened via
 * `LayoutOperation.UpdateDialog({ subject: SYNC_TARGETS_DIALOG, ... })`.
 */
export const SyncTargetsChecklist = ({ integration, availableTargets }: SyncTargetsChecklistProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const initiallySelected = useMemo(() => {
    const ids = new Set<string>();
    for (const target of integration.targets ?? []) {
      if (target.remoteId) ids.add(target.remoteId);
    }
    return ids;
  }, [integration.targets]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(initiallySelected));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(availableTargets.map((target) => target.id)));
  }, [availableTargets]);

  const selectNone = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      const chosen = availableTargets
        .filter((target) => selected.has(target.id))
        .map((target) => ({ remoteId: target.id, name: target.name }));
      const result = await invokePromise(SetIntegrationTargets, {
        integration: Ref.make(integration),
        selected: chosen,
      });
      if (result.error) {
        throw result.error;
      }
      void invokePromise(LayoutOperation.UpdateDialog, { state: false });
    } catch (err) {
      log.catch(err);
      setError(String((err as Error).message ?? err));
    } finally {
      setSubmitting(false);
    }
  }, [availableTargets, selected, integration, invokePromise]);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('sync-targets-dialog.title', { defaultValue: 'Choose sync targets' })}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <Dialog.Description>
          {t('sync-targets-dialog.description', {
            defaultValue: 'Pick which remote targets should be synced into this integration.',
          })}
        </Dialog.Description>

        {availableTargets.length > 0 && (
          <div role='none' className='flex gap-2 mt-form-gap'>
            <Button onClick={selectAll} disabled={submitting}>
              {t('select-all.label', { defaultValue: 'Select all' })}
            </Button>
            <Button onClick={selectNone} disabled={submitting}>
              {t('select-none.label', { defaultValue: 'Select none' })}
            </Button>
          </div>
        )}

        {availableTargets.length === 0 ? (
          <p className='mt-form-gap text-description'>
            {t('no-available-targets.message', { defaultValue: 'No remote targets available.' })}
          </p>
        ) : (
          <div role='none' className='flex flex-col gap-1 mt-form-gap'>
            {availableTargets.map((target) => (
              <Input.Root key={target.id}>
                <div role='none' className='flex items-start gap-2'>
                  <Input.Checkbox
                    checked={selected.has(target.id)}
                    onCheckedChange={() => toggle(target.id)}
                    disabled={submitting}
                  />
                  <div role='none' className='flex flex-col'>
                    <Input.Label>{target.name}</Input.Label>
                    {target.description && <p className='text-description'>{target.description}</p>}
                  </div>
                </div>
              </Input.Root>
            ))}
          </div>
        )}

        {error && <p className='mt-form-gap text-error'>{error}</p>}
      </Dialog.Body>
      <Dialog.ActionBar>
        <Dialog.Close asChild>
          <Button disabled={submitting}>{t('cancel.label', { defaultValue: 'Cancel' })}</Button>
        </Dialog.Close>
        <Button variant='primary' onClick={handleSubmit} disabled={submitting}>
          {submitting
            ? t('submitting.label', { defaultValue: 'Saving…' })
            : t('save.label', { defaultValue: 'Save' })}
        </Button>
      </Dialog.ActionBar>
    </Dialog.Content>
  );
};
