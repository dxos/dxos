//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { AppAnnotation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Skill, Instructions, Trigger } from '@dxos/compute';
import { Database, type Database as DatabaseNS, Filter, Obj, Ref, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Panel, Toolbar, useTranslation, type Label } from '@dxos/react-ui';

import { RoutineForm, MasterDetail, type MasterDetailCreateOption } from '#components';
import { meta } from '#meta';
import { Routine, RoutineCapabilities } from '#types';

import { connectedRoutinesQuery, instructionsForObjectQuery, type RoutineDraft, saveRoutine } from '../../util';

/** Association state of a row relative to the companion's object. */
type Status = 'associated' | 'detached';

export type RoutineCompanionProps = AppSurface.ObjectArticleProps<Obj.Unknown>;

/**
 * Per-object companion: a master-detail list of automations connected to the object, derived from two
 * complementary reverse-ref queries — trigger inputs ({@link connectedRoutinesQuery}) and instructions
 * context objects ({@link instructionsForObjectQuery}). The parent traversal from Instructions to Routine
 * is resolved in JS via {@link Obj.getParent}.
 *
 * Rows persist across disconnection via a session-stable append-only list; detached rows are flagged with
 * a warning badge. The create button opens a template picker (contributed via {@link RoutineCapabilities.Template},
 * filtered by `appliesTo`). Each template's `scaffold` is run in-memory (via `Database.notAvailable`, so
 * templates that access the DB will throw at this stage by design); the resulting draft is shown in
 * `DraftEditor` and committed atomically on Save via {@link saveRoutine}.
 */
export const RoutineCompanion = ({ subject }: RoutineCompanionProps) => {
  const db = Obj.getDatabase(subject);
  if (!db) {
    return null;
  }

  return <RoutineCompanionImpl db={db} object={subject} />;
};

const RoutineCompanionImpl = ({ db, object }: { db: DatabaseNS.Database; object: Obj.Unknown }) => {
  const { t } = useTranslation(meta.profile.key);
  const { items, statusFor, addToList } = useConnectedAutomations(db, object);

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [draft, setDraft] = useState<RoutineDraft | undefined>();
  const selected = useMemo(() => items.find((routine) => routine.id === selectedId), [items, selectedId]);

  const handleSelect = useCallback((id: string | undefined) => {
    setDraft(undefined);
    setSelectedId(id);
  }, []);

  const handleCreateFromTemplate = useCallback(
    async (template: RoutineCapabilities.Template) => {
      const scaffoldDraft = await EffectEx.runPromise(
        template.scaffold({ subject: object }).pipe(Effect.provideService(Database.Service, Database.makeService(db))),
      );

      setSelectedId(undefined);
      // For instruction-based routines, default instructions from the object's skills when the template
      // doesn't provide its own. Operation-action templates (runnable already set) skip instructions.
      const isOperationAction = scaffoldDraft.routine.runnable != null;
      setDraft(
        isOperationAction
          ? { ...scaffoldDraft, trigger: scaffoldDraft.trigger ?? Trigger.make({}) }
          : {
              ...scaffoldDraft,
              instructions:
                scaffoldDraft.instructions ??
                Instructions.make({ skills: skillRefsForObject(object), objects: [Ref.make(object)] }),
              trigger: scaffoldDraft.trigger ?? Trigger.make({}),
            },
      );
    },
    [db, object],
  );

  // Templates filtered to those applicable to this companion's subject.
  const allTemplates = useCapabilities(RoutineCapabilities.Template);
  const createOptions = useMemo<MasterDetailCreateOption[]>(
    () =>
      allTemplates
        .filter((template) => template.appliesTo?.(object) ?? true)
        .map((template) => ({
          id: template.id,
          label: template.label as Label,
          icon: template.icon ?? 'ph--lightning--regular',
          onClick: () => void handleCreateFromTemplate(template),
        })),
    [allTemplates, object, handleCreateFromTemplate],
  );

  const handleCancel = useCallback(() => {
    // Draft was never persisted, nothing to clean up.
    setDraft(undefined);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) {
      return;
    }

    // Add the routine to the database then delegate the rest to saveRoutine, which upserts the owned
    // instructions (carrying the subject in `objects` — the structural connection the query finds) and
    // the primary trigger.
    const persistedRoutine = db.add(draft.routine);
    await saveRoutine(db, persistedRoutine, draft);
    addToList(persistedRoutine.id);
    setSelectedId(persistedRoutine.id);
    setDraft(undefined);
  }, [draft, db, addToList]);

  const handleDelete = useCallback(
    (routine: Routine.Routine) => {
      db.remove(routine);
      setSelectedId((current) => (current === routine.id ? undefined : current));
    },
    [db],
  );

  const detail = draft ? (
    <DraftEditor db={db} draft={draft} onSave={() => void handleSave()} onCancel={handleCancel} />
  ) : selected ? (
    <RoutineForm db={db} routine={selected} />
  ) : null;

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content classNames='dx-document'>
        <MasterDetail<Routine.Routine>
          items={items}
          selectedId={draft ? undefined : selectedId}
          detail={detail}
          createOptions={createOptions}
          createLabel={t('add-automation.label')}
          onSelect={handleSelect}
          onDelete={handleDelete}
          getIcon={() => 'ph--lightning--regular'}
          getLabel={(routine) =>
            Obj.getLabel(routine) ?? t('object-name.placeholder', { ns: Type.getTypename(Routine.Routine) })
          }
          getAdornment={(routine) => {
            const status = statusFor(routine.id);
            return status === 'detached'
              ? {
                  icon: 'ph--warning--regular',
                  label: ['automation-detached.message', { ns: meta.profile.key }] satisfies Label,
                }
              : undefined;
          }}
          emptyLabel={t('no-automations.message')}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

/** Draft automation editor: the pre-filled in-memory form plus Save/Cancel; persists nothing until Save. */
const DraftEditor = ({
  db,
  draft,
  onSave,
  onCancel,
}: {
  db: DatabaseNS.Database;
  draft: RoutineDraft;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <div role='none' className='flex flex-col min-bs-0'>
      <RoutineForm db={db} routine={draft.routine} instructions={draft.instructions} trigger={draft.trigger} />
      <div role='none' className='flex justify-end gap-2 p-2 border-bs border-subdued-separator'>
        <Button onClick={onCancel}>{t('cancel.label')}</Button>
        <Button variant='primary' onClick={onSave}>
          {t('save.label')}
        </Button>
      </div>
    </div>
  );
};

//
// Hooks
//

/**
 * Owns the companion's session-stable automation list. Two complementary reactive queries supply the
 * connected set — trigger-input refs ({@link connectedRoutinesQuery}) and instructions context refs
 * ({@link instructionsForObjectQuery} → parent Routine); rows are accumulated append-only so they never
 * reorder or disappear while mounted. A row whose routine leaves the connected set is flagged via
 * `statusFor` rather than dropped. `addToList` lets callers eagerly seed the list before the reactive
 * query catches up (e.g. immediately after saving a draft).
 */
const useConnectedAutomations = (db: DatabaseNS.Database, object: Obj.Unknown) => {
  // Trigger-based connected routines.
  const triggerConnected = useQuery(db, connectedRoutinesQuery(object));
  // Instructions-based: Instructions objects that list the subject in their `objects` context array.
  // Parent traversal (Instructions → Routine) is resolved in JS since the parent link is a symbol, not a Ref.
  const instructionLinked = useQuery(db, instructionsForObjectQuery(object));
  const instructionRoutines = useMemo(
    () =>
      instructionLinked
        .map((instructions) => Obj.getParent(instructions))
        .filter((parent): parent is Routine.Routine => parent != null && Routine.instanceOf(parent)),
    [instructionLinked],
  );

  // Merge both paths (dedup by id).
  const connected = useMemo(() => {
    const seen = new Set(triggerConnected.map((routine) => routine.id));
    return [...triggerConnected, ...instructionRoutines.filter((routine) => !seen.has(routine.id))];
  }, [triggerConnected, instructionRoutines]);

  const connectedIds = useMemo(() => new Set(connected.map((routine) => routine.id)), [connected]);

  // All routines in the space — used to resolve rows that have left the connected set.
  const all = useQuery(db, Filter.type(Routine.Routine));
  const byId = useMemo(() => new Map(all.map((routine) => [routine.id, routine])), [all]);

  // Session-stable bookkeeping — append-only so rows never reorder or drop.
  const seenOrder = useRef<string[]>([]);
  const everConnected = useRef<Set<string>>(new Set());

  for (const id of connectedIds) {
    everConnected.current.add(id);
    if (!seenOrder.current.includes(id)) {
      seenOrder.current.push(id);
    }
  }

  // Resolve to live objects in stable order, dropping ids whose object was hard-deleted.
  const items = useMemo(
    () => seenOrder.current.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [byId, connectedIds],
  );

  const statusFor = useCallback(
    (id: string): Status => (connectedIds.has(id) ? 'associated' : 'detached'),
    [connectedIds],
  );

  // Eagerly add an id to the stable list before the reactive query catches up (e.g. after saving a draft).
  const addToList = useCallback((id: string) => {
    everConnected.current.add(id);
    if (!seenOrder.current.includes(id)) {
      seenOrder.current.push(id);
    }
  }, []);

  return { items, statusFor, addToList };
};

/** Registry skill refs declared by the object type's {@link AppAnnotation.SkillsAnnotation}. */
const skillRefsForObject = (object: Obj.Unknown): Ref.Ref<Skill.Skill>[] => {
  const type = Obj.getType(object);
  if (!type) {
    return [];
  }
  const keys = Option.getOrElse(() => [] as string[])(AppAnnotation.SkillsAnnotation.get(Type.getSchema(type)));
  return keys.map((key) => Ref.fromURI(Skill.registryURI(key)));
};
