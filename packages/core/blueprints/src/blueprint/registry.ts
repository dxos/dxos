//
// Copyright 2025 DXOS.org
//

import { untracked } from '@preact/signals-core';

import { DeferredTask } from '@dxos/async';
import { Filter, type Space } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';

import { Blueprint } from './blueprint';

/**
 * Blueprint registry.
 */
export class Registry extends Resource {
  private readonly _staticBlueprints: Blueprint[] = [];
  private _databaseBlueprints: Blueprint[] = [];
  private _reconcileBlueprints?: DeferredTask;
  private readonly _space?: Space;
  private readonly _state = live<{ blueprints: Blueprint[] }>({ blueprints: [] });

  constructor(blueprints: Blueprint[], space?: Space) {
    super();
    this._staticBlueprints = blueprints;
    this._space = space;
  }

  protected override async _open(): Promise<void> {
    this._reconcileBlueprints = new DeferredTask(this._ctx, async () => {
      const seen = new Set<string>();
      const newBlueprints: Blueprint[] = [];
      for (const blueprint of [...this._staticBlueprints, ...this._databaseBlueprints]) {
        if (seen.has(blueprint.key)) {
          continue;
        }
        seen.add(blueprint.key);
        newBlueprints.push(blueprint);
      }

      newBlueprints.sort(({ name: a }, { name: b }) => a.localeCompare(b));
      this._state.blueprints = newBlueprints;
    });

    const unsub = this._space?.db.query(Filter.type(Blueprint)).subscribe(({ objects }) => {
      this._databaseBlueprints = objects;
      if (this._ctx.disposed) {
        return;
      }
      invariant(this._reconcileBlueprints, 'Reconcile blueprints task not initialized.');
      this._reconcileBlueprints.schedule();
    });

    this._reconcileBlueprints.schedule();
    this._ctx.onDispose(() => unsub?.());
  }

  protected override async _close(): Promise<void> {
    await this._reconcileBlueprints?.join();
    this._reconcileBlueprints = undefined;
  }

  getByKey(key: string): Blueprint | undefined {
    return untracked(() => this._state.blueprints.find((blueprint) => blueprint.key === key));
  }

  /** @reactive */
  query(): Blueprint[] {
    return this._state.blueprints;
  }
}
