//
// Copyright 2023 DXOS.org
//

import { Event, asyncTimeout, synchronized } from '@dxos/async';
import { type DocumentId, type DocHandle, type DocHandleChangePayload } from '@dxos/automerge/automerge-repo';
import { Context } from '@dxos/context';
import { type Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AutomergeContext } from './automerge-context';
import { AutomergeObject } from './automerge-object';
import { type DocStructure } from './types';
import { type EchoDatabase } from '../database';
import { type Hypergraph } from '../hypergraph';
import {
  type EchoObject,
  base,
  getGlobalAutomergePreference,
  isActualTypedObject,
  isActualAutomergeObject,
  TextObject,
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

  private _ctx?: Context = undefined;

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

  @synchronized
  async open(spaceState: SpaceState) {
    if (this._ctx) {
      log.info('Already open');
      return;
    }
    this._ctx = new Context();

    if (spaceState.rootUrl) {
      try {
        this._docHandle = this.automerge.repo.find(spaceState.rootUrl as DocumentId);
        await asyncTimeout(this._docHandle.whenReady(), 500);
        const ojectIds = Object.keys((await this._docHandle.doc()).objects ?? {});
        this._createObjects(ojectIds);
      } catch (err) {
        log('Error opening document', err);
        await this._fallbackToNewDoc();
      }
    } else {
      await this._fallbackToNewDoc();
    }

    const update = (event: DocHandleChangePayload<DocStructure>) => {
      const updatedObjects = getUpdatedObjects(event);
      this._createObjects(updatedObjects.filter((id) => !this._objects.has(id)));
      this._emitUpdateEvent(updatedObjects);
    };

    this._docHandle.on('change', update);
    this._ctx.onDispose(() => {
      this._docHandle.off('change', update);
    });
  }

  @synchronized
  async close() {
    if (!this._ctx) {
      return;
    }
    void this._ctx.dispose();
    this._ctx = undefined;
  }

  private async _fallbackToNewDoc() {
    if (getGlobalAutomergePreference()) {
      log.error("Automerge is falling back to creating a new document for the space. Changed won't be persisted.");
    }
    this._docHandle = this.automerge.repo.create();
    this._ctx!.onDispose(() => {
      this._docHandle.delete();
    });
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
    if (isActualTypedObject(obj) || obj instanceof TextObject) {
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

  private _emitUpdateEvent(itemsUpdated: string[]) {
    this._updateEvent.emit({
      spaceKey: this._echoDatabase._backend.spaceKey,
      itemsUpdated: itemsUpdated.map((id) => ({ id })),
    });
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

  /**
   * Loads all objects on open and handles objects that are being created not by this client.
   */
  private _createObjects(objectIds: string[]) {
    invariant(this._docHandle);
    for (const id of objectIds) {
      invariant(!this._objects.has(id));
      const obj = new AutomergeObject();
      obj[base]._id = id;
      this._objects.set(obj.id, obj);
      (obj[base] as AutomergeObject)._bind({
        db: this,
        docHandle: this._docHandle,
        path: ['objects', obj.id],
        ignoreCache: true,
      });
    }
  }
}

const getUpdatedObjects = (event: DocHandleChangePayload<DocStructure>): string[] => {
  const updatedObjects = event.patches
    .map(({ path }: { path: string[] }) => {
      if (path.length >= 2 && path[0] === 'objects') {
        return path[1];
      }
      return undefined;
    })
    .filter(Boolean);

  // Remove duplicates.
  return Array.from(new Set(updatedObjects)) as string[];
};
