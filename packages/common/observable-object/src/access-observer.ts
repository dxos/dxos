//
// Copyright 2023 DXOS.org
//

import { UnsubscribeCallback } from '@dxos/async';

import { ObservableObject, subscribe } from './observable-object';

export const ACCESS_OBSERVER_STACK: AccessObserver[] = [];

// TODO(burdon): Document or remove. Generic filter function?
export type SelectionFn = never;

export type SelectionBase = ObservableObject | SelectionFn | undefined | null | false;
export type Selection = SelectionBase | Selection[];

// TODO(dmaretskyi): Convert to class.
export interface SubscriptionHandle {
  update: (selection: Selection) => SubscriptionHandle;
  subscribed: boolean;
  unsubscribe: () => void;
  selected: Set<SelectionBase>;
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
  const subscriptions = new Map<SelectionBase, UnsubscribeCallback>();

  const handle = {
    update: (selection: Selection) => {
      const newSelected = getSetFromSelection(selection);
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
          if (obj && subscribe in obj) {
            subscriptions.set(obj, obj[subscribe](onUpdate));
          }
        });

        onUpdate({});
      }

      return handle;
    },
    subscribed,
    selected: new Set<SelectionBase>(),
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

const getSetFromSelection = (selection: Selection): Set<SelectionBase> => {
  if (!selection) {
    return new Set();
  } else if (typeof selection === 'function') {
    return new Set(); // TODO(burdon): Traverse function?
  } else if (Array.isArray(selection)) {
    return selection.flatMap(getSetFromSelection).reduce((acc, item) => new Set([...acc, ...item]));
  } else {
    return new Set([selection]);
  }
};
