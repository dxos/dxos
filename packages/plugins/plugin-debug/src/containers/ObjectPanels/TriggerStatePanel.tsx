//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Atom from 'effect/reactivity/Atom';
import React, { useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Trigger from '@dxos/compute/Trigger';
import { Obj, Ref } from '@dxos/echo';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { DebugNamespace } from '../../namespace.ts';
import { DebugRow, DebugSection } from './DebugSection.tsx';

const NO_TRIGGERS = Atom.make((): readonly Trigger.State[] => []);

export type TriggerStatePanelProps = { object: Trigger.Trigger };

/** A trigger's live state from the space's {@link Trigger.Manager}: where it runs, when it runs next, and its last result. */
export const TriggerStatePanel = ({ object }: TriggerStatePanelProps) => {
  const { t } = UiHooks.useTranslation(DebugNamespace.key);
  const spaceId = Obj.getDatabase(object)?.spaceId;
  const [manager, setManager] = useState<Trigger.Manager>();
  const [error, setError] = useState<string>();

  const resolveManager = Hooks.useSpaceCallback(spaceId, [Trigger.ManagerService], () =>
    Effect.gen(function* () {
      return yield* Trigger.ManagerService;
    }),
  );

  useEffect(() => {
    if (!spaceId) {
      return;
    }
    resolveManager().then(setManager, (cause: unknown) => setError(String(cause)));
  }, [resolveManager, spaceId]);

  const states = useAtomValue(manager?.triggers ?? NO_TRIGGERS);
  const uri = Ref.make(object).uri;
  const state = states.find((candidate) => candidate.trigger.uri === uri);

  return (
    <DebugSection title={t('trigger-panel.title')}>
      {error && <DebugRow label={t('trigger-panel.error.label')} value={error} />}
      <DebugRow label={t('trigger-panel.enabled.label')} value={String(object.enabled ?? false)} />
      <DebugRow label={t('trigger-panel.spec.label')} value={object.spec ? JSON.stringify(object.spec) : undefined} />
      <DebugRow
        label={t('trigger-panel.registered.label')}
        value={manager ? (state ? state.environment : t('trigger-panel.not-registered.label')) : undefined}
      />
      <DebugRow label={t('trigger-panel.next.label')} value={state?.nextExecution?.toISOString()} />
      <DebugRow label={t('trigger-panel.cooldown.label')} value={state?.cooldownUntil?.toISOString()} />
      <DebugRow
        label={t('trigger-panel.retry.label')}
        value={state?.retry ? `queued #${state.retry.enqueuedAt}` : undefined}
      />
      <DebugRow
        label={t('trigger-panel.last.label')}
        value={
          state?.lastResult
            ? Exit.isSuccess(state.lastResult)
              ? 'success'
              : Cause.pretty(state.lastResult.cause).split('\n')[0]
            : undefined
        }
      />
    </DebugSection>
  );
};
