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
import { Button, Panel } from '@dxos/react-ui';
import { useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { RoutineForm } from '#components';
import { meta } from '#meta';
import { Routine, RoutineOperation } from '#types';

import { type RoutineDraft, saveRoutine } from '../../util';

export type RoutineArticleProps = AppSurface.ObjectArticleProps<Routine.Routine>;

/**
 * Article surface for a {@link Routine}. Read-only by default; the toolbar's Edit action enters an edit
 * session that operates on in-memory clones of the routine, its instructions, and its trigger, persisting them
 * via {@link saveRoutine} on save (so merely viewing never mutates the persisted aggregate).
 */
export const RoutineArticle = ({ role, attendableId, subject }: RoutineArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const registry = useContext(RegistryContext);
  // Subscribe so derived state (action presence, primary trigger) tracks edits to the routine.
  const [automation] = useObject(subject);
  const db = Obj.getDatabase(subject);

  // Toolbar state as atoms, read reactively inside the builder via `get` (the reactive toolbar idiom).
  const editingAtom = useMemo(() => Atom.make(false), []);
  const runningAtom = useMemo(() => Atom.make(false), []);
  const editing = useAtomValue(editingAtom);

  const [session, setSession] = useState<RoutineDraft | undefined>(undefined);

  // A routine action stores no `runnable`; it is an Instructions parented to the automation, so query for one.
  const allInstructions = useQuery(db, Filter.type(Instructions.Instructions));
  const ownedInstructions = useMemo(
    () => allInstructions.find((instructions) => Obj.getParent(instructions)?.id === subject.id),
    [allInstructions, subject.id],
  );
  const primaryTrigger = useMemo(() => {
    for (const ref of automation.triggers) {
      const target = ref.target;
      if (Obj.instanceOf(Trigger.Trigger, target)) {
        return target;
      }
    }
    return undefined;
  }, [automation.triggers]);

  const canRun = useMemo(
    () => Boolean(automation.runnable) || ownedInstructions != null,
    [automation.runnable, ownedInstructions],
  );

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
      name: ownedInstructions?.name ?? automation.name,
      text: ownedInstructions?.text?.target?.content ?? '',
      skills: ownedInstructions ? [...ownedInstructions.skills] : [],
      objects: ownedInstructions?.objects ? [...ownedInstructions.objects] : undefined,
    });
    setSession({
      routine: Obj.clone(subject),
      instructions,
      trigger: primaryTrigger ? Obj.clone(primaryTrigger) : Trigger.make({}),
    });
    registry.set(editingAtom, true);
  }, [subject, automation.name, ownedInstructions, primaryTrigger, registry, editingAtom]);

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
      const builder = MenuBuilder.make().action(
        'run',
        {
          label: ['run.label', { ns: meta.profile.key }],
          icon: 'ph--play--regular',
          disabled: get(runningAtom) || !canRun || get(editingAtom),
          disposition: 'toolbar',
          testId: 'automation.toolbar.run',
        },
        () => handleRun(),
      );
      // The Edit action sits at the trailing edge; while editing, Cancel/Save take over (at the form's footer).
      if (!get(editingAtom)) {
        builder.separator().action(
          'edit',
          {
            label: ['edit.label', { ns: meta.profile.key }],
            icon: 'ph--pencil-simple--regular',
            disposition: 'toolbar',
            testId: 'automation.toolbar.edit',
          },
          () => handleEdit(),
        );
      }
      return builder.build();
    },
    [canRun, handleRun, handleEdit, runningAtom, editingAtom],
  );

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
          {editing && session ? (
            <div role='none' className='flex flex-col min-bs-0'>
              <RoutineForm
                db={db}
                automation={session.routine}
                instructions={session.instructions}
                trigger={session.trigger}
              />
              <div role='none' className='flex justify-end gap-2 p-2 border-bs border-subdued-separator'>
                <Button onClick={handleCancel}>{t('cancel.label')}</Button>
                <Button variant='primary' onClick={() => void handleSave()}>
                  {t('save.label')}
                </Button>
              </div>
            </div>
          ) : (
            <RoutineForm db={db} automation={subject} readonly />
          )}
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};
