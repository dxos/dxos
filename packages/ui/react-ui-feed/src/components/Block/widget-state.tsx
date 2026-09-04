//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * State a widget keeps that must outlive the row it is drawn in.
 *
 * A virtualized feed destroys a row when it leaves the window, and React state inside a widget dies
 * with it — so a reader who expands a tool panel, scrolls away and comes back finds it shut. In a
 * thread that is one long document the question never arises, because nothing ever unmounts; it is
 * the cost of virtualization, and it has to be paid somewhere above the row.
 *
 * Here, in a map owned by `MessageList.Root`. Not in the message, because whether a panel is open is
 * the reader's business and not part of what was said.
 */
export type WidgetStateStore = {
  read: (key: string) => unknown;
  write: (key: string, value: unknown) => void;
};

const WidgetStateContext = createContext<WidgetStateStore | undefined>(undefined);

/** Scopes a widget's key to its message, so two messages' widgets cannot collide. */
const WidgetScopeContext = createContext<string>('');

export const WidgetStateProvider = ({ store, children }: PropsWithChildren<{ store: WidgetStateStore }>) => (
  <WidgetStateContext.Provider value={store}>{children}</WidgetStateContext.Provider>
);

export const WidgetScopeProvider = ({ scope, children }: PropsWithChildren<{ scope: string }>) => (
  <WidgetScopeContext.Provider value={scope}>{children}</WidgetScopeContext.Provider>
);

/** Creates the store a feed's widgets share. One per `MessageList.Root`. */
export const createWidgetStateStore = (): WidgetStateStore => {
  const values = new Map<string, unknown>();
  return {
    read: (key) => values.get(key),
    write: (key, value) => {
      values.set(key, value);
    },
  };
};

/**
 * `useState` for a widget, keyed so it survives the row being destroyed and rebuilt.
 *
 * The key must identify the widget within its message — its tag and position in the document, say —
 * and is scoped to the message automatically. Outside a feed this degrades to plain `useState`, so a
 * widget can still be rendered on its own.
 */
export const useWidgetState = <T,>(key: string, initial: T): [T, (value: T) => void] => {
  const store = useContext(WidgetStateContext);
  const scope = useContext(WidgetScopeContext);
  const scoped = useMemo(() => `${scope}:${key}`, [scope, key]);

  // Seeded from the store on mount, which is the whole point: a remounted widget starts from what
  // the reader last left it at rather than from the default.
  const [value, setValue] = useState<T>(() => {
    const stored = store?.read(scoped);
    return (stored === undefined ? initial : stored) as T;
  });

  const set = useCallback(
    (next: T) => {
      store?.write(scoped, next);
      setValue(next);
    },
    [store, scoped],
  );

  return [value, set];
};
