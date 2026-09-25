//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * The items that have been present for at least `delay` ms, each timed from its own arrival — a
 * later arrival never postpones an earlier one. An item that leaves before its delay is up was
 * never shown.
 */
export const useSettled = <T extends { id: string }>(items: readonly T[], delay: number): T[] => {
  const seenAt = useRef(new Map<string, number>());
  const [settled, setSettled] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const now = Date.now();
    const ids = new Set(items.map((item) => item.id));
    for (const id of seenAt.current.keys()) {
      if (!ids.has(id)) {
        seenAt.current.delete(id);
      }
    }
    let nextDue = Infinity;
    for (const item of items) {
      const arrivedAt = seenAt.current.get(item.id) ?? now;
      seenAt.current.set(item.id, arrivedAt);
      if (!settled.has(item.id)) {
        nextDue = Math.min(nextDue, arrivedAt + delay);
      }
    }
    if (nextDue === Infinity) {
      return;
    }
    const timer = setTimeout(
      () => {
        const then = Date.now();
        setSettled(
          new Set(items.filter((item) => (seenAt.current.get(item.id) ?? then) + delay <= then).map((item) => item.id)),
        );
      },
      Math.max(0, nextDue - now),
    );
    return () => clearTimeout(timer);
  }, [items, settled, delay]);

  return useMemo(() => items.filter((item) => settled.has(item.id)), [items, settled]);
};
