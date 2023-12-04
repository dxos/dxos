//
// Copyright 2023 DXOS.org
//

import { Event, asyncTimeout } from '@dxos/async';
import { type DocumentId, type DocHandle } from '@dxos/automerge/automerge-repo';
import { type Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AutomergeContext } from './automerge-context';
import { type AutomergeObject } from './automerge-object';
import { type DocStructure } from './types';
import { type EchoDatabase } from '../database';
import { type Hypergraph } from '../hypergraph';
import {
  type EchoObject,
  base,
  getGlobalAutomergePreference,
  isActualTypedObject,
  isActualAutomergeObject,
} from '../object';
import { type Schema } from '../proto';

export type SpaceState = {
  // Url of the root automerge document.
  rootUrl?: string;
};

export class AutomergeDb {
  private _docHandle!: DocHandle<DocStructure>;

  /**
   * @internal
   */
  readonly _objects = new Map<string, EchoObject>();
  readonly _objectsSystem = new Map<string, EchoObject>();

  readonly _updateEvent = new Event<{ spaceKey: PublicKey; itemsUpdated: { id: string }[] }>();

  /**
   * @internal
   */
  readonly _echoDatabase: EchoDatabase;

  constructor(
    public readonly graph: Hypergraph,
    public readonly automerge: AutomergeContext,
    echoDatabase: EchoDatabase,
  ) {
    this._echoDatabase = echoDatabase;
  }

  async open(spaceState: SpaceState) {
    if (spaceState.rootUrl) {
      try {
        this._docHandle = this.automerge.repo.find(spaceState.rootUrl as DocumentId);
        await asyncTimeout(this._docHandle.whenReady(), 1_000);
      } catch (err) {
        log.error('Error opening document', err);
        await this._fallbackToNewDoc();
      }
    } else {
      await this._fallbackToNewDoc();
    }

    this._docHandle.on('change', (event) => {
      this._updateEvent.emit({
        spaceKey: this._echoDatabase._backend.spaceKey,
        // TODO(mykola): Use event.patches to determine which items were updated.
        itemsUpdated: Object.keys(event.patchInfo.after.objects).map((id) => ({ id })),
      });
    });
  }

  private async _fallbackToNewDoc() {
    if (getGlobalAutomergePreference()) {
      log.error("Automerge is falling back to creating a new document for the space. Changed won't be persisted.");
    }
    this._docHandle = this.automerge.repo.create();
  }

  getObjectById(id: string): EchoObject | undefined {
    const obj = this._objects.get(id) ?? this._echoDatabase._objects.get(id);

    if (!obj) {
      return undefined;
    }
    if ((obj as any).__deleted === true) {
      return undefined;
    }

    return obj;
  }

  add<T extends EchoObject>(obj: T): T {
    if (isActualTypedObject(obj)) {
      return this._echoDatabase.add(obj);
    }

    if (obj[base]._database) {
      return obj;
    }

    invariant(isActualAutomergeObject(obj));
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
    invariant(isActualAutomergeObject(obj));
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
