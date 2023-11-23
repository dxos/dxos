//
// Copyright 2023 DXOS.org
//

import type { Repo as AutomergeRepo, DocHandle } from '@automerge/automerge-repo';

import { invariant } from '@dxos/invariant';

import { AutomergeObject } from './automerge-object';
import { type Hypergraph } from '../hypergraph';
import { type EchoObject, base } from '../object';

export class AutomergeDb {
  private _repo!: AutomergeRepo;
  private _docHandle!: DocHandle<any>;

  constructor(public readonly graph: Hypergraph) {}

  async open() {
    // eslint-disable-next-line no-eval
    const { Repo: AutomergeRepo } = await eval("import('@automerge/automerge-repo')");
    this._repo = new AutomergeRepo({
      network: [],
    });
    this._docHandle = this._repo.create();
  }

  /**
   * @internal
   */
  readonly _objects = new Map<string, EchoObject>();
  readonly _objectsSystem = new Map<string, EchoObject>();

  getObjectById(id: string): EchoObject | undefined {
    return this._objects.get(id);
  }

  add<T extends EchoObject>(obj: T): T {
    invariant(obj[base] instanceof AutomergeObject);
    invariant(!this._objects.has(obj.id));
    this._objects.set(obj.id, obj);
    (obj[base] as AutomergeObject)._bind({
      db: this,
      docHandle: this._docHandle,
      path: ['objects', obj.id],
    });
    return obj;
  }

  remove<T extends EchoObject>(obj: T) {
    invariant(obj[base] instanceof AutomergeObject);
    invariant(this._objects.has(obj.id));
    this._objects.delete(obj.id);
    (obj[base] as AutomergeObject).__system.deleted = true;
  }
}
