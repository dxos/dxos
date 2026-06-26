//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Filter, Obj, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { SpaceOperation } from '@dxos/plugin-space';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, type ActionGraphProps, useMenuBuilder } from '@dxos/react-ui-menu';

import { RoutineForm, MasterDetail, type MasterDetailAdornment, type MasterDetailIcon } from '#components';
import { meta } from '#meta';
import { Routine, RoutineCapabilities } from '#types';

import { connectedRoutinesQuery } from '../../util';

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
 * template's `scaffold` returns a fully-wired in-memory routine graph, shown editable in {@link RoutineForm}
 * and committed on Save with a single `Database.add` (which cascades the owned children). Existing routines
 * are edited in place.
 */
export const RoutineCompanion = ({ subject: object, attendableId }: RoutineCompanionProps) => {
  // A non-persisted subject has no database; `db` may be undefined. Every hook below tolerates that, and the
  // render is guarded after the last hook (see below) so hook order is identical across renders either way.
  const db = Obj.getDatabase(object);

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
      if (!db) {
        return;
      }

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
    if (!draft || !db) {
      return;
    }

    // The draft is a fully-wired graph (see `Routine.make`); a single add cascades the owned trigger and
    // instructions, and the subject carried in the instructions' `objects` is the structural connection the
    // query finds.
    const persistedRoutine = db.add(draft);
    await db.flush();
    setSelectedId(persistedRoutine.id);
    // Provide the persisted routine directly so the detail panel renders before the reactive queries
    // catch up to include the newly-connected routine.
    setSavedRoutine(persistedRoutine);
    setDraft(undefined);
  }, [draft, db]);

  const handleDelete = useCallback(
    (routine: Routine.Routine) => {
      if (!db) {
        return;
      }

      setSavedRoutine((current) => (current?.id === routine.id ? undefined : current));
      setSelectedId((current) => (current === routine.id ? undefined : current));
      // Route through the space operation so the deletion is undoable (toast + RestoreObjects), rather than
      // mutating the database directly.
      void invokePromise?.(SpaceOperation.RemoveObjects, { objects: [routine] }, { spaceId: db.spaceId });
    },
    [invokePromise, db],
  );

  // Per-row overflow menu: delete. (A routine's on/off state is toggled per-trigger inline in the form,
  // not from the list.)
  const getMenu = useGetMenu({ t, handleDelete });

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

  // Render guard placed after every hook so hook order stays stable: a non-persisted subject (no database)
  // has nothing to list.
  if (!db) {
    return null;
  }

  // One form for both flows. A selected (persisted) routine is edited in place. The create-from-template draft
  // is the only Save/Cancel flow: an in-memory routine shown editable, discarded on Cancel and persisted by a
  // single `Database.add` on Save. The `key` (the routine id) remounts the uncontrolled form when the shown
  // routine changes; the draft carries a fresh id, so no edits leak between rows.
  const shown = draft ?? selected;
  const detail = shown ? (
    <RoutineForm
      key={shown.id}
      db={db}
      routine={shown}
      onSave={draft ? () => void handleSave() : undefined}
      onCancel={draft ? handleCancel : undefined}
    />
  ) : null;

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root>
        <Panel.Toolbar>
          <Menu.Toolbar className='dx-document' />
        </Panel.Toolbar>
        <Panel.Content asChild className='pt-trim-md'>
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              <MasterDetail<Routine.Routine>
                classNames='dx-document'
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
            </ScrollArea.Viewport>
          </ScrollArea.Root>
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
  db: Database.Database | undefined,
  object: Obj.Unknown,
): { items: Routine.Routine[]; statusFor: (id: string) => Status } => {
  const connected = useQuery(db, connectedRoutinesQuery(object));
  const connectedIds = useMemo(() => new Set(connected.map((routine) => routine.id)), [connected]);

  // All routines in the space — used to resolve rows that have left the connected set (still exist, just detached).
  const all = useQuery(db, Filter.type(Routine.Routine));
  const byId = useMemo(() => new Map(all.map((routine) => [routine.id, routine])), [all]);

  // Session-stable, append-only: a routine seen connected this session is remembered so its row never reorders
  // or disappears on disconnect. Scoped to the current subject — reset if this instance is reused for another
  // object so the previous subject's rows don't leak in.
  const seenOrder = useRef<string[]>([]);
  const seenForObject = useRef(object.id);
  if (seenForObject.current !== object.id) {
    seenForObject.current = object.id;
    seenOrder.current = [];
  }
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

/**
 * Reactive family for a routine's on/off state — subscribes (via `get`) to its triggers' `enabled` flags so the
 * row icon re-derives when a flag flips. Keyed by the routine instance.
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
  handleDelete: (routine: Routine.Routine) => void;
};

const useGetMenu = ({ t, handleDelete }: GetMenuOptions) =>
  useCallback(
    (_get: Atom.Context, routine: Routine.Routine): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'delete',
          {
            label: t('delete.label'),
            icon: 'ph--trash--regular',
            testId: 'routine.companion.delete',
          },
          () => handleDelete(routine),
        )
        .build(),
    [t, handleDelete],
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
