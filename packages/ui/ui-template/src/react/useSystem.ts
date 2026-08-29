//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useReducer, useRef } from 'react';

import { type Node } from '../model';
import { type Dispatch } from '../render';
import { type LogEntry, type Registry, type UiState, seedUi, dispatch as systemDispatch } from '../system';

export type UseSystemOptions<Db> = {
  registry: Registry<Db, any>;
  /** The parsed template; instances declaring `id` + `machine` are seeded from the registry. */
  root: Node;
  db?: Db;
};

export type UseSystem = {
  ui: UiState;
  log: readonly LogEntry[];
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
export const useSystem = <Db>({ registry, root, db }: UseSystemOptions<Db>): UseSystem => {
  const initial = useMemo(() => seedUi(registry, root), [registry, root]);
  const ref = useRef<{ ui: UiState; log: readonly LogEntry[] }>({ ui: initial, log: [] });
  const [, force] = useReducer((tick: number) => tick + 1, 0);

  const dispatch = useCallback<Dispatch>(
    (operation, { payload }) => {
      const { ui, entry } = systemDispatch(registry, ref.current.ui, operation, payload, db);
      ref.current = { ui, log: [entry, ...ref.current.log].slice(0, 20) };
      force();
    },
    [registry, db],
  );

  return { ...ref.current, dispatch };
};
