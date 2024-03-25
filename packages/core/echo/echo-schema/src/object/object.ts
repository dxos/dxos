//
// Copyright 2022 DXOS.org
//

import { todo } from '@dxos/debug';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { PublicKey } from '@dxos/keys';

import { base, db, debug, subscribe, type EchoObject } from './types';
import { type EchoDatabase } from '../database';

/**
 * Base class for all echo objects.
 * @deprecated
 */
export abstract class AbstractEchoObject<T = any> implements EchoObject {
  /**
   * @internal
   */
  _id = PublicKey.random().toHex();

  /**
   * Not present for freshly created objects.
   * @internal
   */
  _database?: any;

  /**
   * Present only on objects not persisted in the database.
   * @internal
   */
  _stateMachine: unknown;

  /**
   * Not present for freshly created objects.
   * @internal
   */
  _item?: unknown;

  /**
   * @internal
   */
  _model: T = null as any;

  /**
   * @internal
   */
  _modelConstructor: unknown;

  private readonly _callbacks = new Set<(value: any) => void>();

  protected readonly _signal = compositeRuntime.createSignal();

  protected constructor(modelConstructor: unknown) {
    this._modelConstructor = modelConstructor;
    this._id = PublicKey.random().toHex();
  }

  /** Proxied object. */
  [base]: this = this;

  get [debug]() {
    return `EchoObject(${JSON.stringify({ id: this[base]._id.slice(0, 8) })})`;
  }

  /** Database reference if bound. */
  get [db](): EchoDatabase | undefined {
    return this[base]._database as any;
  }

  [subscribe](callback: (value: any) => void) {
    this[base]._callbacks.add(callback);
    return () => this[base]._callbacks.delete(callback);
  }

  /** ID accessor. */
  get id(): string {
    return this[base]._id;
  }

  /**
   * @internal
   * Called before object is bound to database.
   * `_database` is guaranteed to be set.
   */
  _beforeBind(): void {}

  /**
   * @internal
   * Called after object is bound to database.
   */
  protected _afterBind(): void {}

  /**
   * @internal
   */
  _itemUpdate(): void {
    this._emitUpdate();
  }

  protected _emitUpdate(): void {
    for (const callback of this._callbacks) {
      callback(this);
    }
  }

  /**
   * @internal
   * Called when the object is imported to the database. Assigns the backing item.
   */
  _bind(item: unknown) {}

  /**
   * Snapshot current state.
   * @internal
   */
  _createSnapshot(): any {
    todo();
  }

  /**
   * @internal
   */
  protected _getState(): any {
    todo();
  }

  /**
   * @returns Is this object currently persisted in the database.
   * @internal
   */
  protected _isPersisted(): boolean {
    return !!this._item;
  }

  /**
   * Perform mutation on this object's state.
   * Mutation is applied optimistically: calls to _getState() will return mutated state.
   * @returns Mutation result for the database or undefined if the current object is not persisted.
   * @internal
   */
  protected _mutate(mutation: any): any {
    todo();
  }
}
