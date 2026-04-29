//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { type RemoteTarget } from '../../capabilities/integration-provider';
import { SetIntegrationTargets } from '../../operations/definitions';
import { type Integration } from '../../types';

export type SyncTargetsChecklistProps = {
  integration: Integration.Integration;
  availableTargets: ReadonlyArray<RemoteTarget>;
  onClose: () => void;
};

/**
 * Modal-style checklist for picking which remote targets are synced into the Integration.
 * Pre-checks targets currently in `integration.targets`. On submit invokes the generic
 * SetIntegrationTargets operation, which mechanically reconciles the targets array.
 */
export const SyncTargetsChecklist = ({ integration, availableTargets, onClose }: SyncTargetsChecklistProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const initiallySelected = useMemo(() => {
    const selected = new Set<string>();
    for (const target of integration.targets ?? []) {
      const obj = target.object.target;
      if (obj) selected.add(Obj.getDXN(obj).toString());
    }
    return selected;
  }, [integration.targets]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(initiallySelected));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const toggle = useCallback((dxn: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dxn)) next.delete(dxn);
      else next.add(dxn);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      const selectedRefs = availableTargets
        .filter((target) => selected.has(target.object.dxn.toString()))
        .map((target) => target.object);
      await invokePromise(SetIntegrationTargets, {
        integration: Ref.make(integration),
        selectedRefs,
      });
      onClose();
    } catch (err) {
      log.catch(err);
      setError(String((err as Error).message ?? err));
    } finally {
      setSubmitting(false);
    }
  }, [availableTargets, selected, integration, invokePromise, onClose]);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='bg-base p-4 rounded-lg w-[480px] max-h-[80vh] flex flex-col gap-4'>
        <header>
          <h2 className='text-lg font-medium'>
            {t('sync targets dialog.title', { defaultValue: 'Choose sync targets' })}
          </h2>
          <p className='text-xs text-subdued'>
            {t('sync targets dialog.description', {
              defaultValue: 'Pick which remote targets should be synced into this integration.',
            })}
          </p>
        </header>

        <ul className='overflow-y-auto flex flex-col gap-1'>
          {availableTargets.map((target) => {
            const dxn = target.object.dxn.toString();
            return (
              <li key={dxn} className='flex items-start gap-2 p-2 border rounded'>
                <input
                  type='checkbox'
                  checked={selected.has(dxn)}
                  onChange={() => toggle(dxn)}
                  className='mt-1'
                />
                <div className='flex flex-col'>
                  <div className='text-sm'>{target.name}</div>
                  {target.description && <div className='text-xs text-subdued'>{target.description}</div>}
                </div>
              </li>
            );
          })}
          {availableTargets.length === 0 && (
            <li className='text-xs text-subdued p-2'>
              {t('no available targets.message', { defaultValue: 'No remote targets available.' })}
            </li>
          )}
        </ul>

        {error && <div className='text-xs text-error'>{error}</div>}

        <footer className='flex justify-end gap-2'>
          <button type='button' onClick={onClose} disabled={submitting} className='px-3 py-1 border rounded'>
            {t('cancel.label', { defaultValue: 'Cancel' })}
          </button>
          <button
            type='button'
            onClick={handleSubmit}
            disabled={submitting}
            className='px-3 py-1 bg-accent text-accent-fg rounded'
          >
            {submitting
              ? t('submitting.label', { defaultValue: 'Saving…' })
              : t('save.label', { defaultValue: 'Save' })}
          </button>
        </footer>
      </div>
    </div>
  );
};
