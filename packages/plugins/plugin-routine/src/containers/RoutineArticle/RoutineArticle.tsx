//
// Copyright 2026 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Trigger } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { RoutineForm } from '#components';
import { meta } from '#meta';
import { Routine, RoutineOperation } from '#types';

import { primaryTrigger, runnableInstructions, saveRoutine } from '../../util';

export type RoutineArticleProps = AppSurface.ObjectArticleProps<Routine.Routine>;

/** Whether a routine has any trigger, and whether all of its triggers are enabled. */
type EnabledState = { hasTriggers: boolean; allEnabled: boolean };

/**
 * Article surface for a {@link Routine}. Read-only by default; the toolbar's Edit action enters an edit
 * session that operates on in-memory clones of the routine, its instructions, and its trigger, persisting them
 * via {@link saveRoutine} on save (so merely viewing never mutates the persisted aggregate).
 */
export const RoutineArticle = ({ role, attendableId, subject }: RoutineArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const registry = useContext(RegistryContext);
  // Subscribe so the action's run/edit affordances track the routine's `runnable`.
  const [routine] = useObject(subject);
  const db = Obj.getDatabase(subject);

  // Toolbar state as atoms, read reactively inside the builder via `get` (the reactive toolbar idiom).
  const editingAtom = useMemo(() => Atom.make(false), []);
  const runningAtom = useMemo(() => Atom.make(false), []);
  const editing = useAtomValue(editingAtom);

  // Derive the routine's enabled state in the atom graph, subscribing granularly to the routine (for trigger
  // membership) and to each trigger (for its `enabled` flag) — rather than subscribing this component to the
  // whole trigger list. The toolbar reads it via `get`, so only the toolbar updates when a flag flips.
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

  const [session, setSession] = useState<Routine.Routine | undefined>(undefined);

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

  const handleEdit = useCallback(() => {
    // Deep-clone the owned graph (the runnable instructions + its text, and the trigger) with retained ids so
    // edits stay isolated until save. Ensure the draft has an owned trigger so the form can configure it; the
    // action editor manages the runnable (operation vs instructions) when the user switches kind.
    const draft = Obj.clone(subject, { deep: 'parent', retainId: true });
    if (!primaryTrigger(draft)) {
      const trigger = Trigger.make({});
      Obj.setParent(trigger, draft);
      Obj.update(draft, (draft) => {
        draft.triggers = [...draft.triggers, Ref.make(trigger)];
      });
    }
    setSession(draft);
    registry.set(editingAtom, true);
  }, [subject, registry, editingAtom]);

  const handleCancel = useCallback(() => {
    setSession(undefined);
    registry.set(editingAtom, false);
  }, [registry, editingAtom]);

  const handleSave = useCallback(async () => {
    if (db && session) {
      await saveRoutine(db, session);
    }
    setSession(undefined);
    registry.set(editingAtom, false);
  }, [db, session, registry, editingAtom]);

  const menuActions = useMenuBuilder(
    (get) => {
      const { hasTriggers, allEnabled } = get(enabledAtom);
      const builder = MenuBuilder.make().action(
        'run',
        {
          label: ['run.label', { ns: meta.profile.key }],
          icon: 'ph--play--regular',
          disabled: get(runningAtom) || !canRun || get(editingAtom),
          disposition: 'toolbar',
          testId: 'routine.toolbar.run',
        },
        () => handleRun(),
      );
      // The Edit action sits at the trailing edge; while editing, Cancel/Save take over (at the form's footer).
      if (!get(editingAtom)) {
        builder
          .separator()
          .action(
            'edit',
            {
              label: ['edit.label', { ns: meta.profile.key }],
              icon: 'ph--pencil-simple--regular',
              disposition: 'toolbar',
              testId: 'routine.toolbar.edit',
            },
            () => handleEdit(),
          )
          // Routine-level enable toggle (available whether editing or not): flips every trigger together; disabled
          // until at least one trigger exists. A plain toolbar action has no pressed state, so the icon shows on/off.
          .switch(
            'enabled',
            {
              label: ['enabled.label', { ns: meta.profile.key }],
              iconOnly: true,
              checked: allEnabled,
              disabled: !hasTriggers,
              testId: 'routine.toolbar.enabled',
            },
            () => handleToggleEnabled(),
          );
      }
      return builder.build();
    },
    [canRun, enabledAtom, handleRun, handleToggleEnabled, handleEdit, runningAtom, editingAtom],
  );

  if (!db) {
    return null;
  }

  // Edit mode renders the routine's in-memory clone graph (with Save/Cancel); otherwise the live routine,
  // read-only. The owned trigger/instructions are read off the clone graph.
  const editSession = editing ? session : undefined;
  const editTrigger = editSession ? primaryTrigger(editSession) : undefined;
  const editInstructions = editSession ? runnableInstructions(editSession.runnable) : undefined;

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar classNames='bg-toolbar-surface'>
          <Menu.Toolbar className='dx-document' />
        </Panel.Toolbar>
        <Panel.Content classNames='dx-document'>
          <RoutineForm
            db={db}
            routine={editSession ?? subject}
            instructions={editInstructions}
            trigger={editTrigger}
            readonly={!editSession}
            onSave={editSession ? () => void handleSave() : undefined}
            onCancel={editSession ? handleCancel : undefined}
          />
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};
