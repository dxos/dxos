//
// Copyright 2023 DXOS.org
//

import { UnsubscribeCallback } from '@dxos/async';

import { ObservableObject, subscribe } from './observable-object';

export const ACCESS_OBSERVER_STACK: AccessObserver[] = [];

export type Selection = any[];

// TODO(dmaretskyi): Convert to class.
export interface SubscriptionHandle {
  update: (selection: any) => SubscriptionHandle;
  subscribed: boolean;
  unsubscribe: () => void;
  selected: Set<any>;
}

export type UpdateInfo = {
  // TODO(dmaretskyi): Include metadata about the update.
  updated: any[];
  added: any[];
  removed: any[];
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
  //   Needs to only print once per component.
  // if (this._accessObserverStack.length === 0) {
  //   const currentComponent = getCurrentReactComponent();
  //   if (currentComponent) {
  //     log.warn(
  //       `Warning: Data access in a React component without \`observer\`. Component will not update correctly.\n  at ${currentComponent.fileName}:${currentComponent.lineNumber}`
  //     );
  //   }
  // }
};

/**
 * Subscribe to database updates.
 * Calls the callback when any object from the selection changes.
 * Calls the callback when the selection changes.
 * Always calls the callback on the first `selection.update` call.
 */
// TODO(burdon): Add filter?
// TODO(burdon): Immediately trigger callback.
export const createSubscription = (onUpdate: (info: UpdateInfo) => void): SubscriptionHandle => {
  let subscribed = true;
  let firstUpdate = true;
  const subscriptions = new Map<any, UnsubscribeCallback>();

  const handle = {
    update: (selection: Selection) => {
      const newSelected = new Set(
        selection.filter((item): item is ObservableObject => item && typeof item === 'object' && subscribe in item),
      );
      const removed = [...handle.selected].filter((item) => !newSelected.has(item));
      const added = [...newSelected].filter((item) => !handle.selected.has(item));
      handle.selected = newSelected;
      if (removed.length > 0 || added.length > 0 || firstUpdate) {
        firstUpdate = false;

        removed.forEach((obj) => {
          subscriptions.get(obj)?.();
          subscriptions.delete(obj);
        });

        added.forEach((obj) => {
          subscriptions.set(obj, obj[subscribe](() => {
            onUpdate({
              added: [],
              removed: [],
              updated: [obj],
            });
          }));
        });

        onUpdate({
          added,
          removed,
          updated: [],
        });
      }

      return handle;
    },
    subscribed,
    selected: new Set<any>(),
    unsubscribe: () => {
      Array.from(subscriptions.values()).forEach((unsubscribe) => unsubscribe());
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
