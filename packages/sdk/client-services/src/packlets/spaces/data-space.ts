import { Space, ISpace, Database } from "@dxos/echo-db";

export class DataSpace implements ISpace {
  constructor(
    private readonly _inner: Space,
  ) {}

  get key() {
    return this._inner.key;
  }

  get inner() {
    return this._inner;
  }

  get isOpen() {
    return this._inner.isOpen;
  }

  get database(): Database {
    return this._inner.database!;
  }

  get stateUpdate() {
    return this._inner.stateUpdate;
  }

  async open() {
    await this._inner.open();
  }

  async close() {
    await this._inner.close();
  }
}