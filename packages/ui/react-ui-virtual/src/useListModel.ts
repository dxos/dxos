//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { ListModel } from './list-model';

/**
 * A model over an array the host re-creates per render — the React-prop case.
 *
 * The model is stable; the array is folded into it with `replace`, which is where the prepend
 * inference lives (and the only place — SPEC F-7.1). In an effect rather than during render: the
 * model publishes synchronously to its subscribers, and a subscriber invalidating itself while the
 * host is still rendering is a cross-component update React rejects. The window it opens is one
 * frame, and the window's own subscription closes it.
 */
export const useListModel = <T>(items: readonly T[], getId: (item: T) => string): ListModel<T> => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const model = useMemo(() => new ListModel({ items, getId }), []);
  useEffect(() => {
    if (model.items !== items) {
      model.replace(items);
    }
  }, [model, items]);

  return model;
};
