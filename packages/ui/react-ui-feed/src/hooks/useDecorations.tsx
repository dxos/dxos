//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useMemo } from 'react';

/**
 * A range of one item's rendered text that some producer wants painted (SPEC: Decoration).
 *
 * Search is ONE producer — mentions, lint results and diff spans are others — which is why this is
 * not called a hit: the item painting the range does not care where it came from, and the list does
 * not know it exists at all.
 */
export type Decoration = {
  /** Item (message) id. */
  id: string;
  range: { offset: number; length: number };
  /** Producer tag: 'search' | 'mention' | ... */
  kind: string;
};

const DecorationsContext = createContext<ReadonlyMap<string, readonly Decoration[]>>(new Map());

export type DecorationsProviderProps = PropsWithChildren<{
  decorations?: readonly Decoration[];
}>;

/**
 * THE PATTERN for cross-cutting per-item data (SPEC §Aspects), not a feed feature: a provider at
 * the host carries what producers made, and an item asks for its own by id. The list neither knows
 * nor routes — `hits` left its API entirely. Grouped once per change rather than filtered per item,
 * so a long feed stays O(decorations).
 */
export const DecorationsProvider = ({ decorations, children }: DecorationsProviderProps) => {
  const byId = useMemo(() => {
    const map = new Map<string, Decoration[]>();
    for (const decoration of decorations ?? []) {
      const list = map.get(decoration.id) ?? [];
      list.push(decoration);
      map.set(decoration.id, list);
    }

    return map;
  }, [decorations]);

  return <DecorationsContext.Provider value={byId}>{children}</DecorationsContext.Provider>;
};

const NONE: readonly Decoration[] = [];

/** An item's own decorations. Items work without a provider — they are simply undecorated. */
export const useDecorations = (id: string): readonly Decoration[] => {
  return useContext(DecorationsContext).get(id) ?? NONE;
};
