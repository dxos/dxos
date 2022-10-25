//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';

import { Database } from '../database';
import { Entity } from '../entity';
import { dedupe } from './util';

/**
 * Represents where the selection has started.
 */
export type SelectionRoot = Database | Entity;

/**
 * Returned from each stage of the visitor.
 */
export type SelectionContext<T extends Entity, R> = [entities: T[], result?: R];

/**
 * Query subscription.
 * Represents a live-query (subscription) that can notify about future updates to the relevant subset of items.
 */
export class SelectionResult<T extends Entity, R = any> {
  /**
   * Fired when there are updates in the selection.
   * Only update that are relevant to the selection cause the update.
   */
  readonly update = new Event<SelectionResult<T>>(); // TODO(burdon): Result result object.

  private _lastResult: SelectionContext<T, R> = [[]];

  constructor(
    private readonly _execute: () => SelectionContext<T, R>,
    private readonly _update: Event<Entity[]>,
    private readonly _root: SelectionRoot,
    private readonly _reducer: boolean
  ) {
    this.refresh();

    // Re-run if deps change.
    this.update.addEffect(() =>
      _update.on((currentEntities) => {
        const [previousEntities] = this._lastResult;
        this.refresh();

        // Filters mutation events only if selection (since we can't reason about deps of call methods).
        const set = new Set([...previousEntities, ...this._lastResult![0]]);
        if (
          this._reducer ||
          currentEntities.some((entity) => set.has(entity as any))
        ) {
          this.update.emit(this);
        }
      })
    );
  }

  toString() {
    const [entities] = this._lastResult;
    return `SelectionResult<${JSON.stringify({
      entities: entities.length
    })}>`;
  }

  /**
   * Re-run query.
   */
  refresh() {
    const [entities, result] = this._execute();
    this._lastResult = [dedupe(entities), result];
    return this;
  }

  /**
   * The root of the selection. Either a database or an item. Must be a stable reference.
   */
  get root(): SelectionRoot {
    return this._root;
  }

  /**
   * Get the result of this selection.
   */
  get entities(): T[] {
    if (!this._lastResult) {
      this.refresh();
    }

    const [entities] = this._lastResult!;
    return entities;
  }

  /**
   * Returns the selection or reducer result.
   */
  get value(): R extends void ? T[] : R {
    if (!this._lastResult) {
      this.refresh();
    }

    const [entities, value] = this._lastResult!;
    return (this._reducer ? value : entities) as any;
  }

  /**
   * Return the first element if the set has exactly one element.
   */
  expectOne(): T {
    const entities = this.entities;
    assert(
      entities.length === 1,
      `Expected one result; got ${entities.length}`
    );
    return entities[0];
  }
}
