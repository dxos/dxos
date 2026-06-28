//
// Copyright 2024 DXOS.org
//

import { type Doc, next as A, toJS } from '@automerge/automerge';
import { type AnyDocumentId, type DocumentId } from '@automerge/automerge-repo';
import type * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
import { CreateEpochRequest } from '@dxos/client/halo';
import { type DocHandleProxy, type RepoProxy, ObjectCore, migrateDocument } from '@dxos/echo-client/internal';
import { type DatabaseDirectory, type EntityStructure, EncodedReference, SpaceDocVersion } from '@dxos/echo-protocol';
import { getSchemaURI } from '@dxos/echo/internal';
import * as Type from '@dxos/echo/Type';
import { invariant } from '@dxos/invariant';
import { EID, EntityId } from '@dxos/keys';
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

  // echoUri -> automergeUrl
  private readonly _newLinks: Record<string, string> = {};
  private readonly _flushIds: DocumentId[] = [];
  private readonly _deleteObjects: string[] = [];

  private _newRoot?: DocHandleProxy<DatabaseDirectory> = undefined;

  constructor(private readonly _space: Space) {
    this._repo = this._space.internal.db._repo;
    const rootDoc = this._space.internal.db._getSpaceRootDocHandle().doc();
    invariant(rootDoc, 'Space root document must be available when creating MigrationBuilder');
    this._rootDoc = rootDoc;
  }

  async findObject(id: string): Promise<EntityStructure | undefined> {
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
    migrate: (objectStructure: EntityStructure) => MaybePromise<{ type: Type.AnyEntity; props: any }>,
  ): Promise<void> {
    const objectStructure = await this.findObject(id);
    if (!objectStructure) {
      return;
    }

    const { type, props } = await migrate(objectStructure);
    const schema = Type.getSchema(type);

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
            type: EncodedReference.fromURI(getSchemaURI(schema)!),
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
    await newHandle.whenReady();
    invariant(newHandle.url, 'Migrated document URL not available after whenReady');
    this._newLinks[id] = newHandle.url;
    this._addHandleToFlushList(newHandle.documentId!);
  }

  async addObject(type: Type.AnyEntity, props: any): Promise<string> {
    const resolved = Type.getSchema(type);
    const core = await this._createObject({ schema: resolved, props });
    return core.id;
  }

  createReference(id: string) {
    invariant(EntityId.isValid(id), 'Invalid EntityId.');
    return EncodedReference.fromURI(EID.make({ entityId: id }));
  }

  deleteObject(id: string): void {
    this._deleteObjects.push(id);
  }

  /**
   * Re-materializes linked object documents into fresh Automerge docs without history.
   * Call {@link _commit} to publish a new space epoch with updated root links.
   */
  async compactLinkedDocuments(objectIds?: string[]): Promise<{ compacted: string[]; skipped: string[] }> {
    const linkIds = objectIds ?? Object.keys(this._rootDoc.links ?? {});
    const compacted: string[] = [];
    const skipped: string[] = [];

    for (const id of linkIds) {
      const oldHandle = await this._findObjectContainingHandle(id);
      if (!oldHandle) {
        skipped.push(id);
        continue;
      }

      await oldHandle.whenReady();
      const materialized = toJS(oldHandle.doc()!) as DatabaseDirectory;
      const newHandle = this._repo.create<DatabaseDirectory>(materialized);
      await newHandle.whenReady();
      invariant(newHandle.url, 'Compacted document URL not available after whenReady');
      this._newLinks[id] = newHandle.url;
      this._addHandleToFlushList(newHandle.documentId!);
      compacted.push(id);
    }

    return { compacted, skipped };
  }

  async changeProperties(changeFn: (properties: EntityStructure) => void): Promise<void> {
    if (!this._newRoot) {
      await this._buildNewRoot();
    }
    invariant(this._newRoot, 'New root not created');

    this._newRoot.change((doc: DatabaseDirectory) => {
      const propertiesStructure = doc.objects?.[this._space.properties.id];
      propertiesStructure && changeFn(propertiesStructure);
    });
    await this._newRoot.whenReady();
    this._addHandleToFlushList(this._newRoot.documentId!);
  }

  /**
   * @internal
   */
  async _commit(): Promise<void> {
    if (!this._newRoot) {
      await this._buildNewRoot();
    }
    invariant(this._newRoot, 'New root not created');

    await this._space.db.flush();

    // Create new epoch.
    invariant(this._newRoot.url, 'New root URL not available');
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

  private async _buildNewRoot(): Promise<void> {
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
    await this._newRoot.whenReady();
    this._addHandleToFlushList(this._newRoot.documentId!);
  }

  private async _createObject({
    id,
    schema,
    props,
  }: {
    id?: string;
    schema: Schema.Schema.AnyNoContext;
    props: any;
  }): Promise<ObjectCore> {
    const core = new ObjectCore();
    if (id) {
      core.id = id;
    }

    core.initNewObject(props);
    core.setType(EncodedReference.fromURI(getSchemaURI(schema)!));
    const newHandle = this._repo.create<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: {
        spaceKey: this._space.key.toHex(),
      },
      objects: {
        [core.id]: core.getDoc() as EntityStructure,
      },
    });
    await newHandle.whenReady();
    this._newLinks[core.id] = newHandle.url!;
    this._addHandleToFlushList(newHandle.documentId!);

    return core;
  }

  private _addHandleToFlushList(id: DocumentId): void {
    this._flushIds.push(id);
  }
}
