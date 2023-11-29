//
// Copyright 2023 DXOS.org
//

import { Repo as AutomergeRepo, DocumentId, type DocHandle } from '@dxos/automerge/automerge-repo';
import { invariant } from '@dxos/invariant';

import { AutomergeObject } from './automerge-object';
import { type Hypergraph } from '../hypergraph';
import { type EchoObject, base, getGlobalAutomergePreference } from '../object';
import { AutomergeContext } from './automerge-context';
import { log } from '@dxos/log';

export type SpaceState = {
  // Url of the root automerge document.
  rootUrl?: string;
}

export class AutomergeDb {
  private _docHandle!: DocHandle<any>;

  constructor(
    public readonly graph: Hypergraph,
    public readonly automerge: AutomergeContext,
  ) {}

  async open(spaceState: SpaceState) {
    if(spaceState.rootUrl) {
      try {
        this._docHandle = this.automerge.repo.find(spaceState.rootUrl as DocumentId);
        await this._docHandle.whenReady();
      } catch(err) {
        log.catch('Error opening document', err);
        await this._fallbackToNewDoc();
      }
    } else {
      await this._fallbackToNewDoc();
    }
  }

  private async _fallbackToNewDoc() {
    if(getGlobalAutomergePreference()) {
      log.error('Automerge is falling back to creating a new document for the space. Changed won\'t be persisted.');
    }
    this._docHandle = this.automerge.repo.create();
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
    (obj[base] as AutomergeObject).__system!.deleted = true;
  }
}
