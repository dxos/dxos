//
// Copyright 2024 DXOS.org
//

import { getHeads, type Doc } from '@dxos/automerge/automerge';
import { type AnyDocumentId, type DocHandle, type Repo } from '@dxos/automerge/automerge-repo';
import { type Space } from '@dxos/client/echo';
import { CreateEpochRequest } from '@dxos/client/halo';
import { type AutomergeContext, ObjectCore } from '@dxos/echo-db';
import { type ObjectStructure, type SpaceDoc } from '@dxos/echo-protocol';
import { requireTypeReference, type S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type FlushRequest } from '@dxos/protocols/proto/dxos/echo/service';

export class MigrationBuilder {
  private readonly _repo: Repo;
  private readonly _automergeContext: AutomergeContext;
  private readonly _rootDoc: Doc<SpaceDoc>;

  // echoId -> automergeUrl
  private readonly _newLinks: Record<string, string> = {};
  private readonly _flushStates: FlushRequest.DocState[] = [];
  private readonly _deleteObjects: string[] = [];

  private _newRoot?: DocHandle<SpaceDoc> = undefined;

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
    migrate: (objectStructure: ObjectStructure) => { schema: S.Schema<any>; props: any },
  ) {
    const objectStructure = await this.findObject(id);
    if (!objectStructure) {
      return;
    }

    const { schema, props } = migrate(objectStructure);
    await this._createObject({ id, schema, props });
  }

  async addObject(schema: S.Schema<any>, props: any) {
    const core = await this._createObject({ schema, props });
    return core.id;
  }

  deleteObject(id: string) {
    this._deleteObjects.push(id);
  }

  async changeProperties(changeFn: (properties: ObjectStructure) => void) {
    if (!this._newRoot) {
      await this._buildNewRoot();
    }
    invariant(this._newRoot, 'New root not created');

    this._newRoot.change((doc: SpaceDoc) => {
      const propertiesStructure = doc.objects?.[this._space.properties.id];
      propertiesStructure && changeFn(propertiesStructure);
    });
    this._flushStates.push({
      documentId: this._newRoot.documentId,
      heads: getHeads(this._newRoot.docSync()),
    });
  }

  /**
   * @internal
   */
  async _commit() {
    if (!this._newRoot) {
      await this._buildNewRoot();
    }
    invariant(this._newRoot, 'New root not created');

    await this._automergeContext.flush({
      states: this._flushStates,
    });

    // Create new epoch.
    await this._space.internal.createEpoch({
      migration: CreateEpochRequest.Migration.REPLACE_AUTOMERGE_ROOT,
      automergeRootUrl: this._newRoot.url,
    });
  }

  private async _buildNewRoot() {
    const previousLinks = { ...(this._rootDoc.links ?? {}) };
    for (const id of this._deleteObjects) {
      delete previousLinks[id];
    }

    this._newRoot = this._repo.create<SpaceDoc>({
      access: {
        spaceKey: this._space.key.toHex(),
      },
      objects: this._rootDoc.objects,
      links: {
        ...previousLinks,
        ...this._newLinks,
      },
    });
    await this._newRoot.whenReady();
    this._flushStates.push({
      documentId: this._newRoot.documentId,
      heads: getHeads(this._newRoot.docSync()),
    });
  }

  private async _createObject({ id, schema, props }: { id?: string; schema: S.Schema<any>; props: any }) {
    const core = new ObjectCore();
    if (id) {
      core.id = id;
    }

    core.initNewObject(props);
    core.setType(requireTypeReference(schema));
    const newHandle = this._repo.create<SpaceDoc>({
      access: {
        spaceKey: this._space.key.toHex(),
      },
      objects: {
        [core.id]: core.getDoc(),
      },
    });
    this._newLinks[core.id] = newHandle.url;
    await newHandle.whenReady();
    this._flushStates.push({
      documentId: newHandle.documentId,
      heads: getHeads(newHandle.docSync()),
    });

    return core;
  }
}
