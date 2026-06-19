//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Button, Dialog, Input, ScrollArea, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';
import type { RemoteTarget } from '#types';

import { IntegrationOperation } from '../../types';
import { type Integration } from '../../types';

export type SyncTargetsDialogProps = {
  integration: Integration.Integration;
  availableTargets: ReadonlyArray<RemoteTarget>;
  /** Existing local object to attach to the first newly-selected target. */
  existingTarget?: Ref.Ref<Obj.Unknown>;
};

/**
 * Dialog body for picking which remote targets are synced into an Integration.
 */
export const SyncTargetsDialog = ({ integration, availableTargets, existingTarget }: SyncTargetsDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  const initiallySelected = useMemo(() => {
    const ids = new Set<string>();
    for (const target of integration.targets ?? []) {
      if (target.remoteId) {
        ids.add(target.remoteId);
      }
    }
    return ids;
  }, [integration.targets]);

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
    setSubmitting(true);
    setError(undefined);
    try {
      const chosen = availableTargets
        .filter((target) => selected.has(target.id))
        .map((target) => ({ remoteId: target.id, name: target.name }));
      const result = await invokePromise(IntegrationOperation.SetIntegrationTargets, {
        integration: Ref.make(integration),
        selected: chosen,
        existingTarget,
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
  }, [availableTargets, selected, integration, invokePromise, existingTarget]);

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
          <ScrollArea.Root classNames='max-bs-[24rem]' padding>
            <ScrollArea.Viewport classNames='flex flex-col gap-2'>
              {availableTargets.map((target) => (
                <Input.Root key={target.id}>
                  <div className='flex gap-2'>
                    <div>
                      <Input.Checkbox
                        checked={selected.has(target.id)}
                        onCheckedChange={() => handleToggle(target.id)}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <Input.Label>{target.name}</Input.Label>
                      {target.description && <p className='text-sm text-description'>{target.description}</p>}
                    </div>
                  </div>
                </Input.Root>
              ))}
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}

        {error && <p className='mt-form-gap text-error'>{error}</p>}
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
