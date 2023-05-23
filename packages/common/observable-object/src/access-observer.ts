//
// Copyright 2023 DXOS.org
//

import { EventSubscriptions } from '@dxos/async';

import { ObservableObject, subscribe } from './observable-object';

export const ACCESS_OBSERVER_STACK: AccessObserver[] = [];

// TODO(burdon): Document or remove. Generic filter function?
export type SelectionFn = never;

export type Selection = ObservableObject | SelectionFn | Selection[] | undefined | null | false;

// TODO(dmaretskyi): Convert to class.
export interface SubscriptionHandle {
  update: (selection: Selection) => SubscriptionHandle;
  subscribed: boolean;
  unsubscribe: () => void;
  selectedIds: Set<string>;
}

export type UpdateInfo = {
  // TODO(dmaretskyi): Include metadata about the update.
  // updatedIds: string[];
};

export const createAccessObserver = () => {
  const observer = new AccessObserver(() => {
    ACCESS_OBSERVER_STACK.splice(ACCESS_OBSERVER_STACK.indexOf(observer), 1);
  });
  ACCESS_OBSERVER_STACK.push(observer);
  return observer;
};

export const logObjectAccess = (obj: ObservableObject) => {
  ACCESS_OBSERVER_STACK.at(-1)?.accessed.add(obj);
  // TODO(wittjosiah): Print a helpful warning if we're accessing data without observing it.
};

export const createSubscription = (
  observer: AccessObserver,
  onUpdate: (info: UpdateInfo) => void,
): SubscriptionHandle => {
  let subscribed = true;

  const subscriptions = Array.from(observer.accessed.values()).reduce((acc, obj) => {
    acc.add(obj[subscribe](onUpdate));

    return acc;
  }, new EventSubscriptions());

  let firstUpdate = true;

  const handle = {
    update: (selection: Selection) => {
      const newIds = new Set(getIdsFromSelection(selection));

      const changed = !areSetsEqual(newIds, handle.selectedIds);
      handle.selectedIds = newIds;
      if (changed || firstUpdate) {
        firstUpdate = false;
        onUpdate({});
      }

      return handle;
    },
    subscribed,
    selectedIds: new Set<string>(),
    unsubscribe: () => {
      subscriptions.clear();
      subscribed = false;
    },
  };

  return handle;
};

/**
 * Observes object access.
 */
export class AccessObserver {
  accessed: Set<ObservableObject> = new Set();
  constructor(public pop: () => void) {}
}

const getIdsFromSelection = (selection: Selection): string[] => {
  if (!selection) {
    return [];
  } else if (typeof selection === 'function') {
    return []; // TODO(burdon): Traverse function?
  } else if ('_id' in selection) {
    return [selection._id];
  } else {
    return selection.flatMap(getIdsFromSelection);
  }
};

const areSetsEqual = <T>(a: Set<T>, b: Set<T>) => {
  if (a.size !== b.size) {
    return false;
  }
  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }
  return true;
};
