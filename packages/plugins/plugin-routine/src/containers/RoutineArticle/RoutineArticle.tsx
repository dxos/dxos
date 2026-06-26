//
// Copyright 2026 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { RoutineForm } from '#components';
import { meta } from '#meta';
import { Routine, RoutineOperation } from '#types';

export type RoutineArticleProps = AppSurface.ObjectArticleProps<Routine.Routine>;

/**
 * Article surface for a {@link Routine}. The form edits the live routine in place; each trigger's on/off state
 * is toggled inline in the trigger editor. The toolbar exposes Run.
 *
 * TODO(wittjosiah): Disable editing while the routine is running (you shouldn't mutate running code). This was
 * previously wired as "read-only when enabled" via a routine-level toggle, but that is not how we want to
 * achieve it — reintroduce a run-state-based lock instead.
 */
export const RoutineArticle = ({ role, attendableId, subject }: RoutineArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const registry = useContext(RegistryContext);
  // Subscribe so the run affordance tracks the routine's action (`spec`).
  const [routine] = useObject(subject);
  const db = Obj.getDatabase(subject);

  const runningAtom = useMemo(() => Atom.make(false), []);

  // The action is the routine's `spec` (an operation or the owned instructions); a routine can run once it has one.
  const canRun = useMemo(() => Boolean(routine.spec), [routine.spec]);

  const handleRun = useCallback(() => {
    if (!invokePromise || !db) {
      return;
    }
    // Thread the routine's first trigger as trace attribution so the run appears in history.
    // Manual runs bypass the trigger dispatcher (which normally stamps meta.trigger), so we
    // do it here — history filters on trigger entity id, and without this the run is invisible.
    const triggerRef = routine.triggers[0];
    registry.set(runningAtom, true);
    void invokePromise(
      RoutineOperation.RunRoutine,
      { routine: Ref.make(subject) },
      {
        spaceId: db.spaceId,
        notify: { error: ['run-error.message', { ns: meta.profile.key }] },
        ...(triggerRef ? { tracing: { trigger: triggerRef } } : {}),
      },
    ).finally(() => registry.set(runningAtom, false));
  }, [invokePromise, db, subject, routine, registry, runningAtom]);

  const menuActions = useArticleMenuActions({ canRun, runningAtom, handleRun });

  if (!db) {
    return null;
  }

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar classNames='bg-toolbar-surface'>
          <Menu.Toolbar className='dx-document' />
        </Panel.Toolbar>
        <Panel.Content classNames='dx-document'>
          {/* TODO(wittjosiah): Make read-only while routine is enabled. */}
          <RoutineForm db={db} routine={subject} />
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

//
// Hooks
//

type ArticleMenuActionsOptions = {
  canRun: boolean;
  runningAtom: Atom.Writable<boolean>;
  handleRun: () => void;
};

const useArticleMenuActions = ({ canRun, runningAtom, handleRun }: ArticleMenuActionsOptions) =>
  useMenuBuilder(
    (get) =>
      MenuBuilder.make()
        .action(
          'run',
          {
            label: ['run.label', { ns: meta.profile.key }],
            icon: 'ph--play--regular',
            disabled: get(runningAtom) || !canRun,
            disposition: 'toolbar',
            testId: 'routine.toolbar.run',
          },
          () => handleRun(),
        )
        .build(),
    [canRun, handleRun, runningAtom],
  );
