//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { type Node } from '../model';
import { type Dispatch } from '../render';
import {
  type CapabilityInstances,
  type LogEntry,
  type ModuleInputs,
  type Registry,
  type SlotFrame,
  type UiState,
  mountCapabilities,
  seedModules,
  seedUi,
  startCapabilities,
  dispatch as systemDispatch,
  unmountCapabilities,
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
  /** Module-shared capability instances, mounted once per registry — pass to `viewModules`. */
  capabilities: CapabilityInstances;
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

/**
 * Reconcile published state to the declared shape: keys come from `initial` (so state for slots
 * removed from an edited template is dropped), surviving values come from `current`. Below a
 * declared slot the current value wins wholesale — operations own that structure.
 */
const reconcileSeed = (initial: UiState, current: UiState): UiState => {
  const next: Record<string, unknown> = {};
  for (const [key, seed] of Object.entries(initial)) {
    if (!(key in current)) {
      next[key] = seed;
    } else {
      const existing = current[key];
      next[key] = isPlainObject(seed) && isPlainObject(existing) ? reconcileSeed(seed, existing) : existing;
    }
  }
  return next;
};

export const useSystem = <Db>({ registry, root, db, inputs }: UseSystemOptions<Db>): UseSystem => {
  // Module slots seed once from the registry (shared instances); template lets seed per scope.
  const initial = useMemo(() => deepSeed(seedModules(registry), seedUi(registry, root)), [registry, root]);
  const ref = useRef<{ ui: UiState; log: readonly SequencedLogEntry[] }>({ ui: initial, log: [] });
  const seq = useRef(0);
  // An edited template can add or remove slots: seed the missing, drop the undeclared, and keep
  // the state of the ones that survive. The log is untouched — history outlives declarations.
  ref.current = { ...ref.current, ui: reconcileSeed(initial, ref.current.ui) };
  const [, force] = useReducer((tick: number) => tick + 1, 0);

  const step = useCallback(
    (operation: string, payload?: unknown, frames: readonly SlotFrame[] = []) => {
      // A failed operation is a log entry, not a vanished promise — the loop must stay observable.
      try {
        const { ui, entries } = systemDispatch(registry, ref.current.ui, operation, payload, db, frames, inputs);
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

  const dispatch = useCallback<Dispatch>(
    (operation, { scope, payload }) => step(operation, payload, scope.frames ?? []),
    [step],
  );

  // Capability instances mount once per registry and outlive any one step: their `invoke` reads
  // the current step through a ref, so a db/inputs change never remounts a running machine.
  const stepRef = useRef(step);
  stepRef.current = step;
  const capabilities = useMemo(
    () => mountCapabilities(registry, (operation, payload) => stepRef.current(operation, payload)),
    [registry],
  );
  // Start inside the effect, not at creation: strict mode runs the cleanup on its simulated
  // unmount, and a machine stopped there would silently drop every send after the remount.
  useEffect(() => {
    startCapabilities(capabilities);
    return () => unmountCapabilities(capabilities);
  }, [capabilities]);

  return { ...ref.current, dispatch, capabilities };
};
