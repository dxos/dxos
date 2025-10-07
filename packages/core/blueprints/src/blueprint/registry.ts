//
// Copyright 2025 DXOS.org
//

import { untracked } from '@preact/signals-core';

import { DeferredTask } from '@dxos/async';
import { Resource } from '@dxos/context';
import { Filter } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';

import { Blueprint } from './blueprint';

/**
 * Blueprint registry.
 */
export class Registry extends Resource {
  private _dbBlueprints: Blueprint[] = [];
  private _reconcile?: DeferredTask;
  private readonly _state = live<{ blueprints: Blueprint[] }>({ blueprints: [] });

  constructor(
    private readonly _staticBlueprints: Blueprint[],
    private readonly _db?: EchoDatabase,
  ) {
    super();
  }

  protected override async _open(): Promise<void> {
    this._reconcile = new DeferredTask(this._ctx, async () => {
      const seen = new Set<string>();
      const newBlueprints: Blueprint[] = [];
      for (const blueprint of [...this._staticBlueprints, ...this._dbBlueprints]) {
        if (seen.has(blueprint.key)) {
          continue;
        }
        seen.add(blueprint.key);
        newBlueprints.push(blueprint);
      }

      newBlueprints.sort(({ name: a }, { name: b }) => a.localeCompare(b));
      this._state.blueprints = newBlueprints;
    });

    const unsub = this._db?.query(Filter.type(Blueprint)).subscribe(({ objects }) => {
      this._dbBlueprints = objects;
      if (this._ctx.disposed) {
        return;
      }
      invariant(this._reconcile, 'Reconcile blueprints task not initialized.');
      this._reconcile.schedule();
    });

    this._reconcile.schedule();
    this._ctx.onDispose(() => unsub?.());
  }

  protected override async _close(): Promise<void> {
    await this._reconcile?.join();
    this._reconcile = undefined;
  }

  getByKey(key: string): Blueprint | undefined {
    return untracked(() => this._state.blueprints.find((blueprint) => blueprint.key === key));
  }

  /** @reactive */
  query(): Blueprint[] {
    return this._state.blueprints;
  }
}
