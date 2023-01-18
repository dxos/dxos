//
// Copyright 2023 DXOS.org
//

import { Document, EchoDatabase, Subscription, TypeFilter } from '@dxos/echo-schema';

/**
 * Adds info to records.
 */
export class Bot<T extends Document> {
  protected _subscription?: Subscription;

  // prettier-ignore
  constructor(
    protected readonly _db: EchoDatabase,
    protected readonly _filter: TypeFilter<T>
  ) {}

  start() {
    stop();

    // TODO(burdon): Update when object mutated.
    const query = this._db.query(this._filter);
    this._subscription = query.subscribe(async (query) => {
      const objects = query.getObjects();
      await Promise.all(
        objects.map(async (object) => {
          await this.onUpdate(object);
        })
      );
    });

    return this;
  }

  stop() {
    this._subscription?.();
    return this;
  }

  async onUpdate(object: T): Promise<void> {}
}
