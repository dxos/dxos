//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useReducer, useRef } from 'react';

import { type Node } from '../model';
import { type Dispatch } from '../render';
import {
  type LogEntry,
  type ModuleInputs,
  type Registry,
  type UiState,
  seedModules,
  seedUi,
  dispatch as systemDispatch,
} from '../system';

export type UseSystemOptions<Db> = {
  registry: Registry<Db, any>;
  /** The parsed template; `let` slots under `id`-scoped elements are seeded from the registry. */
  root: Node;
  db?: Db;
  /** Host-supplied module inputs (query results, wiring), keyed by module key. */
  inputs?: ModuleInputs;
};

/** A log entry with a stable identity, so list renderers can key it. */
export type SequencedLogEntry = LogEntry & { seq: number };

export type UseSystem = {
  ui: UiState;
  log: readonly SequencedLogEntry[];
  /** For the renderer: resolves the `on-*` operation key and steps the system. */
  dispatch: Dispatch;
};

/**
 * The React shell around the framework-free system: published state, the operation log, and a
 * dispatch that steps them. All state changes flow through here — the render itself is a pure
 * function of `ui` plus whatever context the caller derives from it.
 *
 * State lives in a ref and renders via a forced update, NOT in a `useState` updater: an operation
 * may mutate the database, and strict mode re-runs updaters — which would run the mutation twice.
 * The event handler runs once; the step belongs there.
 */
const isPlainObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Add keys missing from `current` at any depth without clobbering values that survive an edit. */
const deepSeed = (initial: UiState, current: UiState): UiState => {
  let next = current;
  for (const [key, seed] of Object.entries(initial)) {
    const existing = next[key];
    if (!(key in next)) {
      next = { ...next, [key]: seed };
    } else if (isPlainObject(seed) && isPlainObject(existing)) {
      next = { ...next, [key]: deepSeed(seed, existing) };
    }
  }
  return next;
};

export const useSystem = <Db>({ registry, root, db, inputs }: UseSystemOptions<Db>): UseSystem => {
  // Module slots seed once from the registry (shared instances); template lets seed per scope.
  const initial = useMemo(() => deepSeed(seedModules(registry), seedUi(registry, root)), [registry, root]);
  const ref = useRef<{ ui: UiState; log: readonly SequencedLogEntry[] }>({ ui: initial, log: [] });
  const seq = useRef(0);
  // An edited template can introduce new slots: seed the ones that are missing without resetting
  // the state of the ones that survive.
  ref.current = { ...ref.current, ui: deepSeed(initial, ref.current.ui) };
  const [, force] = useReducer((tick: number) => tick + 1, 0);

  const dispatch = useCallback<Dispatch>(
    (operation, { scope, payload }) => {
      // A failed operation is a log entry, not a vanished promise — the loop must stay observable.
      try {
        const { ui, entries } = systemDispatch(
          registry,
          ref.current.ui,
          operation,
          payload,
          db,
          scope.frames ?? [],
          inputs,
        );
        const sequenced = entries.map((entry) => ({ ...entry, seq: seq.current++ }));
        ref.current = { ui, log: [...sequenced.reverse(), ...ref.current.log].slice(0, 20) };
      } catch (err) {
        ref.current = {
          ...ref.current,
          log: [{ operation, payload: `ERROR: ${err}`, seq: seq.current++ }, ...ref.current.log].slice(0, 20),
        };
      }
      force();
    },
    [registry, db, inputs],
  );

  return { ...ref.current, dispatch };
};
