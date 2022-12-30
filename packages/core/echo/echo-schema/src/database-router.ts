//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Entity } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

import { EchoDatabase, Selection, SubscriptionHandle } from './database';
import { unproxy } from './defs';
import { Document, DocumentBase } from './object';

export class DatabaseRouter {
  private readonly _accessObserverStack: AccessObserver[] = [];

  private readonly _databases = new ComplexMap<PublicKey, EchoDatabase>(PublicKey.hash);

  private readonly _update = new Event<{ spaceKey: PublicKey; changedEntities: Entity<any>[] }>();

  register(spaceKey: PublicKey, database: EchoDatabase) {
    this._databases.set(spaceKey, database);
    database._echo.update.on((changedEntities) => this._update.emit({ spaceKey, changedEntities }));
  }

  /**
   * Subscribe to database updates.
   */
  // TODO(burdon): Add filter?
  createSubscription(onUpdate: () => void): SubscriptionHandle {
    let subscribed = true;

    const unsubscribe = this._update.on(({ changedEntities }) => {
      subscribed = false;
      if (changedEntities.some((entity) => handle.selectedIds.has(entity.id))) {
        onUpdate();
      }
    });

    const handle = {
      update: (selection: Selection) => {
        handle.selectedIds = new Set(getIdsFromSelection(selection));
        return handle;
      },
      subscribed,
      selectedIds: new Set<string>(),
      unsubscribe
    };

    return handle;
  }

  createAccessObserver(): AccessObserver {
    const observer = new AccessObserver(() => {
      this._accessObserverStack.splice(this._accessObserverStack.indexOf(observer), 1);
    });
    this._accessObserverStack.push(observer);
    return observer;
  }

  /**
   * @internal
   */
  _logObjectAccess(obj: Document) {
    this._accessObserverStack.at(-1)?.accessed.add(obj);
  }
}

/**
 * Observes object access.
 */
export class AccessObserver {
  accessed: Set<DocumentBase> = new Set();

  constructor(public pop: () => void) {}
}

const getIdsFromSelection = (selection: Selection): string[] => {
  if (selection instanceof DocumentBase) {
    return [selection[unproxy]._id];
  } else if (typeof selection === 'function') {
    return []; // TODO(burdon): Traverse function?
  } else if (!selection) {
    return [];
  } else {
    return selection.flatMap(getIdsFromSelection);
  }
};
