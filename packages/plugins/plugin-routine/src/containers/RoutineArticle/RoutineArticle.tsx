//
// Copyright 2026 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Instructions, Trigger } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { RoutineForm } from '#components';
import { meta } from '#meta';
import { Routine, RoutineOperation } from '#types';

import { type RoutineDraft, saveRoutine } from '../../util';

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

  const [session, setSession] = useState<RoutineDraft | undefined>(undefined);

  // A routine action stores no `runnable`; it is an Instructions parented to the routine, so query for one.
  const allInstructions = useQuery(db, Filter.type(Instructions.Instructions));
  const ownedInstructions = useMemo(
    () => allInstructions.find((instructions) => Obj.getParent(instructions)?.id === subject.id),
    [allInstructions, subject.id],
  );

  const canRun = useMemo(
    () => Boolean(routine.runnable) || ownedInstructions != null,
    [routine.runnable, ownedInstructions],
  );

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
    // Build the edit session: detached in-memory clones so edits never touch the persisted aggregate until save.
    const instructions = Instructions.make({
      name: ownedInstructions?.name ?? subject.name,
      text: ownedInstructions?.text?.target?.content ?? '',
      skills: ownedInstructions ? [...ownedInstructions.skills] : [],
      objects: ownedInstructions?.objects ? [...ownedInstructions.objects] : undefined,
    });
    const primaryTrigger = subject.triggers[0]?.target;
    setSession({
      routine: Obj.clone(subject),
      instructions,
      trigger:
        primaryTrigger && Obj.instanceOf(Trigger.Trigger, primaryTrigger)
          ? Obj.clone(primaryTrigger)
          : Trigger.make({}),
    });
    registry.set(editingAtom, true);
  }, [subject, ownedInstructions, registry, editingAtom]);

  const handleCancel = useCallback(() => {
    setSession(undefined);
    registry.set(editingAtom, false);
  }, [registry, editingAtom]);

  const handleSave = useCallback(async () => {
    if (db && session) {
      await saveRoutine(db, subject, session);
    }
    setSession(undefined);
    registry.set(editingAtom, false);
  }, [db, subject, session, registry, editingAtom]);

  const menuActions = useMenuBuilder(
    (get) => {
      const { hasTriggers, allEnabled } = get(enabledAtom);
      const builder = MenuBuilder.make()
        .action(
          'run',
          {
            label: ['run.label', { ns: meta.profile.key }],
            icon: 'ph--play--regular',
            disabled: get(runningAtom) || !canRun || get(editingAtom),
            disposition: 'toolbar',
            testId: 'routine.toolbar.run',
          },
          () => handleRun(),
        )
        // Routine-level enable toggle (available whether editing or not): flips every trigger together; disabled
        // until at least one trigger exists. A plain toolbar action has no pressed state, so the icon shows on/off.
        .action(
          'enabled',
          {
            label: ['enabled.label', { ns: meta.profile.key }],
            icon: allEnabled ? 'ph--toggle-right--fill' : 'ph--toggle-left--regular',
            checked: allEnabled,
            disabled: !hasTriggers,
            disposition: 'toolbar',
            testId: 'routine.toolbar.enabled',
          },
          () => handleToggleEnabled(),
        );
      // The Edit action sits at the trailing edge; while editing, Cancel/Save take over (at the form's footer).
      if (!get(editingAtom)) {
        builder.separator().action(
          'edit',
          {
            label: ['edit.label', { ns: meta.profile.key }],
            icon: 'ph--pencil-simple--regular',
            disposition: 'toolbar',
            testId: 'routine.toolbar.edit',
          },
          () => handleEdit(),
        );
      }
      return builder.build();
    },
    [canRun, enabledAtom, handleRun, handleToggleEnabled, handleEdit, runningAtom, editingAtom],
  );

  if (!db) {
    return null;
  }

  // Edit mode renders the routine's in-memory clones (with Save/Cancel); otherwise the live routine, read-only.
  const editSession = editing ? session : undefined;

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar classNames='bg-toolbar-surface'>
          <Menu.Toolbar className='dx-document' />
        </Panel.Toolbar>
        <Panel.Content classNames='dx-document'>
          <RoutineForm
            db={db}
            routine={editSession?.routine ?? subject}
            instructions={editSession?.instructions}
            trigger={editSession?.trigger}
            readonly={!editSession}
            onSave={editSession ? () => void handleSave() : undefined}
            onCancel={editSession ? handleCancel : undefined}
          />
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};
