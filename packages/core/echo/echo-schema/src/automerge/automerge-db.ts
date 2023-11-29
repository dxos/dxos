//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { Repo as AutomergeRepo, type DocHandle } from '@dxos/automerge/automerge-repo';
import { type Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';

import { AutomergeObject } from './automerge-object';
import { type EchoDatabase } from '../database';
import { type Hypergraph } from '../hypergraph';
import { type EchoObject, base, TypedObject } from '../object';
import { type Schema } from '../proto';

export class AutomergeDb {
  private _repo!: AutomergeRepo;
  private _docHandle!: DocHandle<any>;

  readonly _updateEvent = new Event<{ spaceKey: PublicKey; itemsUpdated: { id: string }[] }>();

  constructor(public readonly graph: Hypergraph, private readonly _echoDatabase: EchoDatabase) {}

  async open() {
    this._repo = new AutomergeRepo({
      network: [],
    });
    this._docHandle = this._repo.create();
    this._docHandle.on('change', (event) => {
      this._updateEvent.emit({
        spaceKey: this._echoDatabase._backend.spaceKey,
        itemsUpdated: Object.keys(event.patchInfo.after.objects).map((id) => ({ id })),
      });
    });
  }

  /**
   * @internal
   */
  _objects = new Map<string, EchoObject>();
  readonly _objectsSystem = new Map<string, EchoObject>();

  getObjectById(id: string): EchoObject | undefined {
    return this._objects.get(id);
  }

  add<T extends EchoObject>(obj: T): T {
    if (obj[base] instanceof TypedObject) {
      return this._echoDatabase.add(obj);
    }

    if (obj[base]._database) {
      return obj;
    }

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
    (obj[base] as AutomergeObject).__system!.deleted = true;
  }

  /**
   * @internal
   */
  _resolveSchema(type: Reference): Schema | undefined {
    if (type.protocol === 'protobuf') {
      return this.graph.types.getSchema(type.itemId);
    } else {
      // TODO(dmaretskyi): Cross-space references.
      return this.getObjectById(type.itemId) as Schema | undefined;
    }
  }
}
