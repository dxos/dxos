//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Obj, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { SpaceOperation } from '@dxos/plugin-space';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, type ActionGraphProps, useMenuBuilder } from '@dxos/react-ui-menu';
import { getStyles } from '@dxos/ui-theme';

import { RoutineForm, MasterDetail, type MasterDetailIcon } from '#components';
import { meta } from '#meta';
import { Routine, RoutineCapabilities } from '#types';

import { connectedRoutinesQuery, instructionsForObjectQuery, saveRoutine } from '../../util';

export type RoutineCompanionProps = AppSurface.ObjectArticleProps<Obj.Unknown>;

/**
 * Per-object companion: a master-detail list of automations connected to the object, derived from two
 * complementary reverse-ref queries — trigger inputs ({@link connectedRoutinesQuery}) and instructions
 * context objects ({@link instructionsForObjectQuery}). The parent traversal from Instructions to Routine
 * is resolved in JS via {@link Obj.getParent}.
 *
 * Only currently-connected routines are listed; a routine that loses its association elsewhere drops out.
 * The toolbar create menu offers a template picker (contributed via {@link RoutineCapabilities.Template},
 * filtered by `appliesTo`). Each template's `scaffold` returns an in-memory routine draft (a deep 'owned'
 * clone for edits); it is shown editable in {@link RoutineForm} and committed atomically on Save via
 * {@link saveRoutine}.
 */
export const RoutineCompanion = ({ subject, attendableId }: RoutineCompanionProps) => {
  const db = Obj.getDatabase(subject);
  if (!db) {
    return null;
  }

  return <RoutineCompanionImpl db={db} object={subject} attendableId={attendableId} />;
};

const RoutineCompanionImpl = ({
  db,
  object,
  attendableId,
}: {
  db: Database.Database;
  object: Obj.Unknown;
  attendableId?: string;
}) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const items = useConnectedAutomations(db, object);

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [draft, setDraft] = useState<Routine.Routine | undefined>();
  // After saving a draft, hold the persisted routine directly so the detail panel renders immediately
  // before the reactive queries catch up to include the newly-connected routine.
  const [savedRoutine, setSavedRoutine] = useState<Routine.Routine | undefined>();
  const selected = useMemo(
    () => items.find((routine) => routine.id === selectedId) ?? savedRoutine,
    [items, selectedId, savedRoutine],
  );

  const handleSelect = useCallback(
    (id: string | undefined) => {
      // Ignore selection changes while a draft is active — the edit (or create) must be saved or cancelled first.
      if (draft) {
        return;
      }
      setSavedRoutine(undefined);
      setSelectedId(id);
    },
    [draft],
  );

  const handleCreateFromTemplate = useCallback(
    async (template: RoutineCapabilities.Template) => {
      // The scaffold returns a fully-wired in-memory routine draft graph (its owned trigger/instructions
      // bound and parented); nothing is persisted until Save.
      const scaffolded = await EffectEx.runPromise(
        template.scaffold({ subject: object }).pipe(Effect.provideService(Database.Service, Database.makeService(db))),
      );

      setSavedRoutine(undefined);
      setSelectedId(undefined);
      setDraft(scaffolded);
    },
    [db, object],
  );

  // Templates filtered to those applicable to this companion's subject.
  const allTemplates = useCapabilities(RoutineCapabilities.Template);
  const templates = useMemo(
    () => allTemplates.filter((template) => template.appliesTo?.(object) ?? true),
    [allTemplates, object],
  );

  // Toolbar create menu: a `+` dropdown of applicable templates, pushed to the trailing edge by a growing gap
  // separator (disabled while a draft is in progress so it can't be silently replaced).
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .separator('gap')
        .group(
          'create',
          {
            variant: 'dropdownMenu',
            label: t('add-routine.label'),
            icon: 'ph--plus--regular',
            iconOnly: true,
            caretDown: false,
            disabled: draft != null || templates.length === 0,
            testId: 'routine.companion.create',
          },
          (group) => {
            for (const template of templates) {
              group.action(
                template.id,
                { label: template.label, icon: template.icon ?? 'ph--lightning--regular' },
                () => void handleCreateFromTemplate(template),
              );
            }
          },
        )
        .build(),
    [t, templates, draft, handleCreateFromTemplate],
  );

  const handleCancel = useCallback(() => {
    // Draft was never persisted, nothing to clean up.
    setDraft(undefined);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) {
      return;
    }

    // saveRoutine persists the draft graph (adding the routine and its owned trigger/instructions, the
    // subject carried in `objects` — the structural connection the query finds).
    const persistedRoutine = await saveRoutine(db, draft);
    setSelectedId(persistedRoutine.id);
    // Provide the persisted routine directly so the detail panel renders before the reactive queries
    // catch up to include the newly-connected routine.
    setSavedRoutine(persistedRoutine);
    setDraft(undefined);
  }, [draft, db]);

  const handleDelete = useCallback(
    (routine: Routine.Routine) => {
      setSavedRoutine((current) => (current?.id === routine.id ? undefined : current));
      setSelectedId((current) => (current === routine.id ? undefined : current));
      // Route through the space operation so the deletion is undoable (toast + RestoreObjects), rather than
      // mutating the database directly.
      void invokePromise?.(SpaceOperation.RemoveObjects, { objects: [routine] }, { spaceId: db.spaceId });
    },
    [invokePromise, db],
  );

  // Edit an isolated deep 'owned' clone (retained ids) so changes don't touch the live routine until Save;
  // the detail panel then shows the editable form (saveRoutine reconciles by id).
  const handleEdit = useCallback((routine: Routine.Routine) => {
    setSavedRoutine(undefined);
    setSelectedId(routine.id);
    setDraft(Obj.clone(routine, { deep: 'owned', retainId: true }));
  }, []);

  // Flip every trigger of the routine together (its on/off state), reading the current state at click time.
  const handleToggleEnabled = useCallback((routine: Routine.Routine) => {
    const next = !routineEnabled(routine);
    for (const ref of routine.triggers) {
      const trigger = ref.target;
      if (trigger) {
        Obj.update(trigger, (trigger) => {
          trigger.enabled = next;
        });
      }
    }
  }, []);

  // Per-row overflow menu: edit, enable/disable (disabled until a trigger exists), and delete. Built reactively
  // per row (see MasterDetail) — `get` subscribes to this routine's triggers' `enabled` flags, so the
  // enable/disable label tracks the live state without re-rendering the whole list.
  const getMenu = useCallback(
    (get: Atom.Context, routine: Routine.Routine): ActionGraphProps => {
      const { hasTriggers, enabled } = getRoutineEnabled(get, routine);
      return MenuBuilder.make()
        .action(
          'toggle-enabled',
          {
            label: enabled ? t('enabled.label') : t('disabled.label'),
            icon: enabled ? 'ph--check-square--regular' : 'ph--square--regular',
            disabled: !hasTriggers,
            testId: 'routine.companion.toggle-enabled',
          },
          () => handleToggleEnabled(routine),
        )
        .action(
          'edit',
          {
            label: t('edit.label'),
            icon: 'ph--pencil-simple--regular',
            testId: 'routine.companion.edit',
          },
          () => handleEdit(routine),
        )
        .action(
          'delete',
          {
            label: t('delete.label'),
            icon: 'ph--trash--regular',
            testId: 'routine.companion.delete',
          },
          () => handleDelete(routine),
        )
        .build();
    },
    [t, handleEdit, handleToggleEnabled, handleDelete],
  );

  // Row icon, reactive per row: an enabled routine takes its type's hue (amber); disabled uses the default
  // icon colour. Subscribes (via `get`) only to this routine's triggers' `enabled` flags.
  const getIcon = useCallback((get: Atom.Context, routine: Routine.Routine): MasterDetailIcon => {
    const { icon, hue } = Obj.getIcon(routine) ?? { icon: 'ph--lightning--regular', hue: undefined };
    const { enabled } = getRoutineEnabled(get, routine);
    return { icon, classNames: enabled && hue ? getStyles(hue).text : undefined };
  }, []);

  // Row label, reactive per row via the object's label atom, so a rename updates the row live.
  const getLabel = useCallback(
    (get: Atom.Context, routine: Routine.Routine) =>
      get(Obj.labelAtom(routine)) || t('object-name.placeholder', { ns: Type.getTypename(Routine.Routine) }),
    [t],
  );

  // One form for both states: a selected row renders read-only; the menu's Edit action opens the same routine
  // as an editable draft (a deep 'owned' clone) with the form's Cancel/Save actions. The form derives its
  // owned instructions and trigger from the routine graph, so no separate draft editor is needed. The `key`
  // (the routine id) remounts the form when the selection switches, so no uncontrolled state leaks between rows.
  const shown = draft ?? selected;
  const detail = shown ? (
    <RoutineForm
      key={shown.id}
      db={db}
      routine={shown}
      readonly={!draft}
      onSave={draft ? () => void handleSave() : undefined}
      onCancel={draft ? handleCancel : undefined}
    />
  ) : null;

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
        <Panel.Content classNames='dx-document'>
          <MasterDetail<Routine.Routine>
            items={items}
            selectedId={selectedId}
            detail={detail}
            onSelect={handleSelect}
            getMenu={getMenu}
            getIcon={getIcon}
            getLabel={getLabel}
            emptyLabel={t('no-routines.message')}
          />
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

//
// Hooks
//

/**
 * The companion's automation list: the routines currently connected to the object, from two complementary
 * reactive queries — trigger-input refs ({@link connectedRoutinesQuery}) and instructions context refs
 * ({@link instructionsForObjectQuery} → parent Routine). A session-stable order is maintained so connected
 * rows don't reorder while mounted; a routine that leaves the connected set drops out (it isn't persisted as
 * a detached row). A freshly-saved routine appears once the queries reflect it.
 */
const useConnectedAutomations = (db: Database.Database, object: Obj.Unknown): Routine.Routine[] => {
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

  const connectedById = useMemo(() => new Map(connected.map((routine) => [routine.id, routine])), [connected]);

  // Session-stable order — append-only so connected rows never reorder while mounted.
  const seenOrder = useRef<string[]>([]);
  for (const id of connectedById.keys()) {
    if (!seenOrder.current.includes(id)) {
      seenOrder.current.push(id);
    }
  }

  // Resolve to live objects in stable order, dropping ids no longer connected (detached or deleted).
  return useMemo(
    () => seenOrder.current.flatMap((id) => (connectedById.has(id) ? [connectedById.get(id)!] : [])),
    [connectedById],
  );
};

/** Whether a routine has at least one trigger and all of its triggers are enabled (its on/off state). */
const routineEnabled = (routine: Routine.Routine): boolean => {
  const triggers = routine.triggers.flatMap((ref) => (ref.target ? [ref.target] : []));
  return triggers.length > 0 && triggers.every((trigger) => trigger.enabled === true);
};

/**
 * Reactive read of a routine's on/off state — subscribes (via `get`) to its triggers' `enabled` flags so a
 * consumer (the per-row menu, the row icon) re-derives when a flag flips.
 */
const getRoutineEnabled = (get: Atom.Context, routine: Routine.Routine): { hasTriggers: boolean; enabled: boolean } => {
  const triggers = get(Obj.atomProperty(routine, 'triggers'));
  const hasTriggers = triggers.length > 0;
  return {
    hasTriggers,
    enabled: hasTriggers && triggers.every((ref) => get(Obj.atomProperty(ref, 'enabled')) === true),
  };
};
