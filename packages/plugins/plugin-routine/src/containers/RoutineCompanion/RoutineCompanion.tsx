//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Filter, Obj, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { SpaceOperation } from '@dxos/plugin-space';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, type ActionGraphProps, useMenuBuilder } from '@dxos/react-ui-menu';

import { RoutineForm, MasterDetail, type MasterDetailAdornment, type MasterDetailIcon } from '#components';
import { meta } from '#meta';
import { Routine, RoutineCapabilities } from '#types';

import { connectedRoutinesQuery, saveRoutine } from '../../util';

/** Association state of a row relative to the companion's object. */
type Status = 'associated' | 'detached';

export type RoutineCompanionProps = AppSurface.ObjectArticleProps<Obj.Unknown>;

/**
 * Per-object companion: a master-detail list of automations connected to the object, via
 * {@link connectedRoutinesQuery} (covers both trigger-input and instructions-context paths).
 *
 * The list is session-stable: a routine seen connected stays listed even after it loses its association
 * (flagged with a 'detached' adornment) so it doesn't vanish mid-edit. The toolbar create menu offers a
 * template picker (contributed via {@link RoutineCapabilities.Template}, filtered by `appliesTo`); each
 * template's `scaffold` returns an in-memory routine draft, shown editable in {@link RoutineForm} and
 * committed atomically on Save via {@link saveRoutine}. Existing routines are edited in place.
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
  const { items, statusFor } = useConnectedRoutines(db, object);

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [draft, setDraft] = useState<Routine.Routine | undefined>();
  // After saving a draft, hold the persisted routine directly so the detail panel renders immediately
  // before the reactive queries catch up to include the newly-connected routine.
  const [savedRoutine, setSavedRoutine] = useState<Routine.Routine | undefined>();
  const selected = useMemo(
    () => items.find((routine) => routine.id === selectedId) ?? savedRoutine,
    [items, selectedId, savedRoutine],
  );

  // Editability of the selected (already-persisted) routine is derived from its enabled state — editable while
  // disabled, locked read-only once enabled (mirroring the article). Reactive so toggling enable flips it live.
  const selectedEnabledAtom = useMemo(
    () => Atom.make((get) => (selected ? get(routineEnabled(selected)).enabled : false)),
    [selected],
  );
  const selectedEnabled = useAtomValue(selectedEnabledAtom);

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
  const menuActions = useCompanionMenuActions({ t, templates, draft, handleCreateFromTemplate });

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

  // Flip every trigger of the routine together (its on/off state), reading the current state at click time.
  const handleToggleEnabled = useCallback((routine: Routine.Routine) => {
    const next = !getRoutineEnabled(routine);
    for (const ref of routine.triggers) {
      const trigger = ref.target;
      if (trigger) {
        Obj.update(trigger, (trigger) => {
          trigger.enabled = next;
        });
      }
    }
  }, []);

  // Per-row overflow menu: enable/disable (disabled until a trigger exists) and delete. Built reactively per row
  // (see MasterDetail) — `get` subscribes to this routine's triggers' `enabled` flags, so the enable/disable
  // label tracks the live state without re-rendering the whole list. (Editing is in place: disable a routine to
  // edit it, so there is no separate edit action.)
  const getMenu = useGetMenu({ t, handleToggleEnabled, handleDelete });

  // Row icon, reactive per row: an enabled routine takes its type's hue (amber); disabled uses the default
  // icon colour. Subscribes (via `get`) only to this routine's triggers' `enabled` flags.
  const getIcon = useCallback((get: Atom.Context, routine: Routine.Routine): MasterDetailIcon => {
    const { icon, hue } = Obj.getIcon(routine) ?? { icon: 'ph--lightning--regular', hue: undefined };
    const { enabled } = get(routineEnabled(routine));
    return { icon, hue: enabled ? hue : undefined };
  }, []);

  // Row label, reactive per row via the object's label atom, so a rename updates the row live.
  const getLabel = useCallback(
    (get: Atom.Context, routine: Routine.Routine): string =>
      get(Obj.labelAtom(routine)) || t('object-name.placeholder', { ns: Type.getTypename(Routine.Routine) }) || '',
    [t],
  );

  // Trailing adornment: a warning badge on a row whose routine has left the connected set (it stays in the
  // session-stable list — see {@link useConnectedRoutines} — rather than disappearing while still selected/edited).
  const getAdornment = useCallback(
    (_get: Atom.Context, routine: Routine.Routine): MasterDetailAdornment | undefined =>
      statusFor(routine.id) === 'detached'
        ? { icon: 'ph--warning--regular', label: t('routine-detached.message') }
        : undefined,
    [statusFor, t],
  );

  // One form for both flows. A selected (persisted) routine is edited in place — editable while disabled,
  // read-only once enabled — with no Save/Cancel. The create-from-template draft is the only Save/Cancel flow:
  // an in-memory routine shown editable, discarded on Cancel and committed by `saveRoutine` on Save. The `key`
  // (the routine id) remounts the uncontrolled form when the shown routine changes; the draft carries a fresh
  // id, so no edits leak between rows.
  const shown = draft ?? selected;
  const detail = shown ? (
    <RoutineForm
      key={shown.id}
      db={db}
      routine={shown}
      readonly={draft ? false : selectedEnabled}
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
            getAdornment={getAdornment}
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
 * The companion's automation list, session-stable and frozen against disconnection: routines connected to the
 * object via {@link connectedRoutinesQuery} (trigger-input and instructions-context paths unified) are
 * accumulated append-only so rows never reorder, and a routine that leaves the connected set stays in the list
 * (flagged `detached` via {@link statusFor}) rather than vanishing mid-edit — only a hard-deleted routine drops
 * out. Detached rows are resolved from the space's full routine set since the connected query no longer returns
 * them. A freshly-saved routine appears once the query reflects it.
 */
const useConnectedRoutines = (
  db: Database.Database,
  object: Obj.Unknown,
): { items: Routine.Routine[]; statusFor: (id: string) => Status } => {
  const connected = useQuery(db, connectedRoutinesQuery(object));
  const connectedIds = useMemo(() => new Set(connected.map((routine) => routine.id)), [connected]);

  // All routines in the space — used to resolve rows that have left the connected set (still exist, just detached).
  const all = useQuery(db, Filter.type(Routine.Routine));
  const byId = useMemo(() => new Map(all.map((routine) => [routine.id, routine])), [all]);

  // Session-stable, append-only: a routine seen connected this session is remembered so its row never reorders
  // or disappears on disconnect.
  const seenOrder = useRef<string[]>([]);
  for (const id of connectedIds) {
    if (!seenOrder.current.includes(id)) {
      seenOrder.current.push(id);
    }
  }

  // Resolve to live objects in stable order, dropping only ids whose routine was hard-deleted.
  const items = useMemo(
    () => seenOrder.current.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
    [byId, connectedIds],
  );

  const statusFor = useCallback(
    (id: string): Status => (connectedIds.has(id) ? 'associated' : 'detached'),
    [connectedIds],
  );

  return { items, statusFor };
};

/** Whether a routine has at least one trigger and all of its triggers are enabled (its on/off state). */
const getRoutineEnabled = (routine: Routine.Routine): boolean => {
  const triggers = routine.triggers.flatMap((ref) => (ref.target ? [ref.target] : []));
  return triggers.length > 0 && triggers.every((trigger) => trigger.enabled === true);
};

/**
 * Reactive family for a routine's on/off state — subscribes (via `get`) to its triggers' `enabled` flags so a
 * consumer (the per-row menu, the row icon, the detail's read-only gate) re-derives when a flag flips. Keyed by
 * the routine instance.
 */
const routineEnabled = Atom.family(
  (routine: Routine.Routine): Atom.Atom<{ hasTriggers: boolean; enabled: boolean }> =>
    Atom.make((get) => {
      const triggers = get(Obj.atomProperty(routine, 'triggers'));
      const hasTriggers = triggers.length > 0;
      return {
        hasTriggers,
        enabled: hasTriggers && triggers.every((ref) => get(Obj.atomProperty(ref, 'enabled')) === true),
      };
    }),
);

type GetMenuOptions = {
  t: ReturnType<typeof useTranslation>['t'];
  handleToggleEnabled: (routine: Routine.Routine) => void;
  handleDelete: (routine: Routine.Routine) => void;
};

const useGetMenu = ({ t, handleToggleEnabled, handleDelete }: GetMenuOptions) =>
  useCallback(
    (get: Atom.Context, routine: Routine.Routine): ActionGraphProps => {
      const { hasTriggers, enabled } = get(routineEnabled(routine));
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
    [t, handleToggleEnabled, handleDelete],
  );

type CompanionMenuActionsOptions = {
  t: ReturnType<typeof useTranslation>['t'];
  templates: RoutineCapabilities.Template[];
  draft: Routine.Routine | undefined;
  handleCreateFromTemplate: (template: RoutineCapabilities.Template) => Promise<void>;
};

const useCompanionMenuActions = ({ t, templates, draft, handleCreateFromTemplate }: CompanionMenuActionsOptions) =>
  useMenuBuilder(
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
