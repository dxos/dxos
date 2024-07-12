//
// Copyright 2024 DXOS.org
//

import { type Doc, next as am } from '@dxos/automerge/automerge';
import { type AnyDocumentId, type DocumentId } from '@dxos/automerge/automerge-repo';
import { type Space } from '@dxos/client/echo';
import { CreateEpochRequest } from '@dxos/client/halo';
import { type AutomergeContext, ObjectCore, migrateDocument, type RepoProxy, type DocHandleProxy } from '@dxos/echo-db';
import { SpaceDocVersion, encodeReference, type ObjectStructure, type SpaceDoc, Reference } from '@dxos/echo-protocol';
import { requireTypeReference, type S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type MaybePromise } from '@dxos/util';

export class MigrationBuilder {
  private readonly _repo: RepoProxy;
  private readonly _automergeContext: AutomergeContext;
  private readonly _rootDoc: Doc<SpaceDoc>;

  // echoId -> automergeUrl
  private readonly _newLinks: Record<string, string> = {};
  private readonly _flushIds: DocumentId[] = [];
  private readonly _deleteObjects: string[] = [];

  private _newRoot?: DocHandleProxy<SpaceDoc> = undefined;

  constructor(private readonly _space: Space) {
    this._repo = this._space.db.coreDatabase.automerge.repo;
    this._automergeContext = this._space.db.coreDatabase.automerge;
    // TODO(wittjosiah): Accessing private API.
    this._rootDoc = (this._space.db.coreDatabase as any)._automergeDocLoader
      .getSpaceRootDocHandle()
      .docSync() as Doc<SpaceDoc>;
  }

  async findObject(id: string): Promise<ObjectStructure | undefined> {
    const documentId = (this._rootDoc.links?.[id] || this._newLinks[id]) as AnyDocumentId | undefined;
    const docHandle = documentId && this._repo.find(documentId);
    if (!docHandle) {
      return undefined;
    }

    await docHandle.whenReady();
    const doc = docHandle.docSync() as Doc<SpaceDoc>;
    return doc.objects?.[id];
  }

  async migrateObject(
    id: string,
    migrate: (objectStructure: ObjectStructure) => MaybePromise<{ schema: S.Schema<any>; props: any }>,
  ) {
    const objectStructure = await this.findObject(id);
    if (!objectStructure) {
      return;
    }

    const { schema, props } = await migrate(objectStructure);

    const oldHandle = await this._findObjectContainingHandle(id);
    invariant(oldHandle);

    const newState: SpaceDoc = {
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
    const migratedDoc = migrateDocument(oldHandle.docSync() as Doc<SpaceDoc>, newState);
    const newHandle = this._repo.import<SpaceDoc>(am.save(migratedDoc));
    this._newLinks[id] = newHandle.url;
    this._addHandleToFlushList(newHandle);
  }

  async addObject(schema: S.Schema<any>, props: any) {
    const core = this._createObject({ schema, props });
    return core.id;
  }

  createReference(id: string) {
    return encodeReference(new Reference(id));
  }

  deleteObject(id: string) {
    this._deleteObjects.push(id);
  }

  changeProperties(changeFn: (properties: ObjectStructure) => void) {
    if (!this._newRoot) {
      this._buildNewRoot();
    }
    invariant(this._newRoot, 'New root not created');

    this._newRoot.change((doc: SpaceDoc) => {
      const propertiesStructure = doc.objects?.[this._space.properties.id];
      propertiesStructure && changeFn(propertiesStructure);
    });
    this._addHandleToFlushList(this._newRoot);
  }

  /**
   * @internal
   */
  async _commit() {
    if (!this._newRoot) {
      this._buildNewRoot();
    }
    invariant(this._newRoot, 'New root not created');

    await this._automergeContext.flush({
      documentIds: this._flushIds,
    });

    // Create new epoch.
    await this._space.internal.createEpoch({
      migration: CreateEpochRequest.Migration.REPLACE_AUTOMERGE_ROOT,
      automergeRootUrl: this._newRoot.url,
    });
  }

  private async _findObjectContainingHandle(id: string): Promise<DocHandleProxy<SpaceDoc> | undefined> {
    const documentId = (this._rootDoc.links?.[id] || this._newLinks[id]) as AnyDocumentId | undefined;
    const docHandle = documentId && this._repo.find(documentId);
    if (!docHandle) {
      return undefined;
    }

    await docHandle.whenReady();
    return docHandle;
  }

  private _buildNewRoot() {
    const previousLinks = { ...(this._rootDoc.links ?? {}) };
    for (const id of this._deleteObjects) {
      delete previousLinks[id];
    }

    this._newRoot = this._repo.create<SpaceDoc>({
      version: SpaceDocVersion.CURRENT,
      access: {
        spaceKey: this._space.key.toHex(),
      },
      objects: this._rootDoc.objects,
      links: {
        ...previousLinks,
        ...this._newLinks,
      },
    });
    this._addHandleToFlushList(this._newRoot);
  }

  private _createObject({ id, schema, props }: { id?: string; schema: S.Schema<any>; props: any }) {
    const core = new ObjectCore();
    if (id) {
      core.id = id;
    }

    core.initNewObject(props);
    core.setType(requireTypeReference(schema));
    const newHandle = this._repo.create<SpaceDoc>({
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

  private _addHandleToFlushList(handle: DocHandleProxy<any>) {
    this._flushIds.push(handle.documentId);
  }
}
