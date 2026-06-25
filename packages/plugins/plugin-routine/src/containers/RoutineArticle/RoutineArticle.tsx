//
// Copyright 2026 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
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

/** Whether a routine has any trigger, and whether all of its triggers are enabled. */
type EnabledState = { hasTriggers: boolean; allEnabled: boolean };

/**
 * Article surface for a {@link Routine}. Editability is derived from the enabled state: a disabled routine is
 * editable in place (edits autosave to the live routine) and an enabled one is locked read-only, so toggling
 * it off from the toolbar is how you re-open it for editing. A freshly created routine starts disabled, hence
 * editable. The toolbar exposes Run and the routine-level enable toggle.
 */
export const RoutineArticle = ({ role, attendableId, subject }: RoutineArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const registry = useContext(RegistryContext);
  // Subscribe so the run affordance tracks the routine's `runnable`.
  const [routine] = useObject(subject);
  const db = Obj.getDatabase(subject);

  const runningAtom = useMemo(() => Atom.make(false), []);

  // Derive the routine's enabled state in the atom graph, subscribing granularly to the routine (for trigger
  // membership) and to each trigger (for its `enabled` flag) — rather than subscribing this component to the
  // whole trigger list. Drives the toolbar toggle and whether the form is editable.
  const enabledAtom = useMemo(
    () =>
      Atom.make<EnabledState>((get) => {
        // Subscribe to the routine's `triggers` (membership) and each trigger's `enabled` property only — these
        // property atoms fire solely when that value changes, keeping the subscription as narrow as possible.
        const refs = get(Obj.atomProperty(subject, 'triggers'));
        const enabledStates = refs.map((ref) => get(Obj.atomProperty(ref, 'enabled')));
        const hasTriggers = enabledStates.length > 0;
        return { hasTriggers, allEnabled: hasTriggers && enabledStates.every((enabled) => enabled === true) };
      }),
    [subject],
  );
  const { allEnabled } = useAtomValue(enabledAtom);

  // The action is the routine's `runnable` (an operation or the owned instructions); a routine can run once it
  // has one.
  const canRun = useMemo(() => Boolean(routine.runnable), [routine.runnable]);

  const handleToggleEnabled = useCallback(() => {
    const next = !registry.get(enabledAtom).allEnabled;
    for (const ref of subject.triggers) {
      const trigger = ref.target;
      if (trigger) {
        Obj.update(trigger, (trigger) => {
          trigger.enabled = next;
        });
      }
    }
  }, [registry, enabledAtom, subject]);

  const handleRun = useCallback(() => {
    if (!invokePromise || !db) {
      return;
    }
    registry.set(runningAtom, true);
    void invokePromise(
      RoutineOperation.RunRoutine,
      { routine: Ref.make(subject) },
      {
        spaceId: db.spaceId,
        notify: { error: ['run-error.message', { ns: meta.profile.key }] },
      },
    ).finally(() => registry.set(runningAtom, false));
  }, [invokePromise, db, subject, registry, runningAtom]);

  const menuActions = useArticleMenuActions({ canRun, enabledAtom, runningAtom, handleRun, handleToggleEnabled });

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
          {/* Editable while disabled; enabling locks the routine read-only. Edits autosave to the live routine. */}
          <RoutineForm db={db} routine={subject} readonly={allEnabled} />
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
  enabledAtom: Atom.Atom<EnabledState>;
  runningAtom: Atom.Writable<boolean>;
  handleRun: () => void;
  handleToggleEnabled: () => void;
};

const useArticleMenuActions = ({
  canRun,
  enabledAtom,
  runningAtom,
  handleRun,
  handleToggleEnabled,
}: ArticleMenuActionsOptions) =>
  useMenuBuilder(
    (get) => {
      const { hasTriggers, allEnabled } = get(enabledAtom);
      return (
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
          .separator()
          // Routine-level enable toggle: flips every trigger together; disabled until at least one trigger exists.
          // Enabling locks the routine read-only, so this toggle is also how the routine is re-opened for editing.
          .switch(
            'enabled',
            {
              label: ['enabled.label', { ns: meta.profile.key }],
              checked: allEnabled,
              disabled: !hasTriggers,
              testId: 'routine.toolbar.enabled',
            },
            () => handleToggleEnabled(),
          )
          .build()
      );
    },
    [canRun, enabledAtom, handleRun, handleToggleEnabled, runningAtom],
  );
