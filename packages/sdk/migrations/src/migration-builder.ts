//
// Copyright 2024 DXOS.org
//

import { next as A, type Doc } from '@automerge/automerge';
import { type AnyDocumentId, type DocumentId } from '@automerge/automerge-repo';
import type * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
import { CreateEpochRequest } from '@dxos/client/halo';
import { requireTypeReference } from '@dxos/echo/internal';
import { type DocHandleProxy, ObjectCore, type RepoProxy, migrateDocument } from '@dxos/echo-db';
import {
  type DatabaseDirectory,
  type ObjectStructure,
  Reference,
  SpaceDocVersion,
  encodeReference,
} from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type MaybePromise } from '@dxos/util';

/*

Considering a better API for this:

```ts
const migration = space.db.beginMigration(); // all actions are not visible to queries and are only applied once you call `apply`

migration.applyObjectMigration(defineMigration(From, To, { ... }));

migration.delete(id);
migration.add(obj);

await migration.apply(); // Will create new epoch.
```

*/

// TODO(dmaretskyi): We no longer need to hook into ECHO internals, with the changes to echo APIs.
export class MigrationBuilder {
  private readonly _repo: RepoProxy;
  private readonly _rootDoc: Doc<DatabaseDirectory>;

  // echoId -> automergeUrl
  private readonly _newLinks: Record<string, string> = {};
  private readonly _flushIds: DocumentId[] = [];
  private readonly _deleteObjects: string[] = [];

  private _newRoot?: DocHandleProxy<DatabaseDirectory> = undefined;

  constructor(private readonly _space: Space) {
    this._repo = this._space.db.coreDatabase._repo;
    // TODO(wittjosiah): Accessing private API.
    this._rootDoc = (this._space.db.coreDatabase as any)._automergeDocLoader
      .getSpaceRootDocHandle()
      .doc() as Doc<DatabaseDirectory>;
  }

  async findObject(id: string): Promise<ObjectStructure | undefined> {
    const documentId = (this._rootDoc.links?.[id] || this._newLinks[id])?.toString() as AnyDocumentId | undefined;
    const docHandle = documentId && this._repo.find(documentId);
    if (!docHandle) {
      return undefined;
    }

    await docHandle.whenReady();
    const doc = docHandle.doc() as Doc<DatabaseDirectory>;
    return doc.objects?.[id];
  }

  async migrateObject(
    id: string,
    migrate: (objectStructure: ObjectStructure) => MaybePromise<{ schema: Schema.Schema.AnyNoContext; props: any }>,
  ): Promise<void> {
    const objectStructure = await this.findObject(id);
    if (!objectStructure) {
      return;
    }

    const { schema, props } = await migrate(objectStructure);

    const oldHandle = await this._findObjectContainingHandle(id);
    invariant(oldHandle);

    const newState: DatabaseDirectory = {
      version: SpaceDocVersion.CURRENT,
      access: {
        spaceKey: this._space.key.toHex(),
      },
      objects: {
        [id]: {
          system: {
            type: encodeReference(requireTypeReference(schema)),
          },
          data: props,
          meta: {
            keys: [],
          },
        },
      },
    };
    const migratedDoc = migrateDocument(oldHandle.doc() as Doc<DatabaseDirectory>, newState);
    const newHandle = this._repo.import<DatabaseDirectory>(A.save(migratedDoc));
    this._newLinks[id] = newHandle.url;
    this._addHandleToFlushList(newHandle);
  }

  async addObject(schema: Schema.Schema.AnyNoContext, props: any): Promise<string> {
    const core = this._createObject({ schema, props });
    return core.id;
  }

  createReference(id: string) {
    return encodeReference(Reference.localObjectReference(id));
  }

  deleteObject(id: string): void {
    this._deleteObjects.push(id);
  }

  changeProperties(changeFn: (properties: ObjectStructure) => void): void {
    if (!this._newRoot) {
      this._buildNewRoot();
    }
    invariant(this._newRoot, 'New root not created');

    this._newRoot.change((doc: DatabaseDirectory) => {
      const propertiesStructure = doc.objects?.[this._space.properties.id];
      propertiesStructure && changeFn(propertiesStructure);
    });
    this._addHandleToFlushList(this._newRoot);
  }

  /**
   * @internal
   */
  async _commit(): Promise<void> {
    if (!this._newRoot) {
      this._buildNewRoot();
    }
    invariant(this._newRoot, 'New root not created');

    await this._space.db.flush();

    // Create new epoch.
    await this._space.internal.createEpoch({
      migration: CreateEpochRequest.Migration.REPLACE_AUTOMERGE_ROOT,
      automergeRootUrl: this._newRoot.url,
    });
  }

  private async _findObjectContainingHandle(id: string): Promise<DocHandleProxy<DatabaseDirectory> | undefined> {
    const documentId = (this._rootDoc.links?.[id] || this._newLinks[id])?.toString() as AnyDocumentId | undefined;
    const docHandle = documentId && this._repo.find(documentId);
    if (!docHandle) {
      return undefined;
    }

    await docHandle.whenReady();
    return docHandle;
  }

  private _buildNewRoot(): void {
    const links = { ...(this._rootDoc.links ?? {}) };
    for (const id of this._deleteObjects) {
      delete links[id];
    }

    for (const [id, url] of Object.entries(this._newLinks)) {
      links[id] = new A.RawString(url);
    }

    this._newRoot = this._repo.create<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: {
        spaceKey: this._space.key.toHex(),
      },
      objects: this._rootDoc.objects,
      links,
    });
    this._addHandleToFlushList(this._newRoot);
  }

  private _createObject({
    id,
    schema,
    props,
  }: {
    id?: string;
    schema: Schema.Schema.AnyNoContext;
    props: any;
  }): ObjectCore {
    const core = new ObjectCore();
    if (id) {
      core.id = id;
    }

    core.initNewObject(props);
    core.setType(requireTypeReference(schema));
    const newHandle = this._repo.create<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: {
        spaceKey: this._space.key.toHex(),
      },
      objects: {
        [core.id]: core.getDoc() as ObjectStructure,
      },
    });
    this._newLinks[core.id] = newHandle.url;
    this._addHandleToFlushList(newHandle);

    return core;
  }

  private _addHandleToFlushList(handle: DocHandleProxy<any>): void {
    this._flushIds.push(handle.documentId);
  }
}
