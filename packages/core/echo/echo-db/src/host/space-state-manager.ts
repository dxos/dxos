//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';

import { Event } from '@dxos/async';
import { interpretAsDocumentId, type DocHandle, type DocumentId } from '@dxos/automerge/automerge-repo';
import { Resource, Context } from '@dxos/context';
import type { SpaceDoc } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import type { SpaceId } from '@dxos/keys';

import { DatabaseRoot } from './database-root';

export class SpaceStateManager extends Resource {
  private readonly _roots = new Map<DocumentId, DatabaseRoot>();
  private readonly _rootBySpace = new Map<SpaceId, DocumentId>();
  private readonly _perRootContext = new Map<DocumentId, Context>();
  private readonly _lastSpaceDocumentList = new Map<SpaceId, DocumentId[]>();

  public readonly spaceDocumentListUpdated = new Event<SpaceDocumentListUpdatedEvent>();

  protected override async _close(ctx: Context): Promise<void> {
    for (const [_, rootCtx] of this._perRootContext) {
      await rootCtx.dispose();
    }
    this._roots.clear();
  }

  get roots(): ReadonlyMap<DocumentId, DatabaseRoot> {
    return this._roots;
  }

  getRootByDocumentId(documentId: DocumentId): DatabaseRoot | undefined {
    return this._roots.get(documentId);
  }

  addRoot(handle: DocHandle<SpaceDoc>): DatabaseRoot {
    const root = new DatabaseRoot(handle);
    this._roots.set(handle.documentId, root);
    return root;
  }

  async assignRootToSpace(spaceId: SpaceId, rootDocumentId: DocumentId) {
    invariant(this._roots.has(rootDocumentId));

    if (this._rootBySpace.get(spaceId) === rootDocumentId) {
      return;
    }

    const prevRootId = this._rootBySpace.get(spaceId);
    if (prevRootId) {
      void this._perRootContext.get(prevRootId)?.dispose();
      this._perRootContext.delete(prevRootId);
    }

    this._rootBySpace.set(spaceId, rootDocumentId);
    const root = this._roots.get(rootDocumentId)!;
    const ctx = new Context();

    this._perRootContext.set(rootDocumentId, ctx);

    await root.handle.whenReady();

    const checkSpaceDocumentList = async () => {
      const documentIds = root.getAllLinkedDocuments().map((url) => interpretAsDocumentId(url));
      if (!isEqual(documentIds, this._lastSpaceDocumentList.get(spaceId))) {
        this._lastSpaceDocumentList.set(spaceId, documentIds);
        this.spaceDocumentListUpdated.emit(new SpaceDocumentListUpdatedEvent(spaceId, documentIds));
      }
    };
    root.handle.addListener('change', checkSpaceDocumentList);
    ctx.onDispose(() => root.handle.removeListener('change', checkSpaceDocumentList));

    void checkSpaceDocumentList();
  }
}

export class SpaceDocumentListUpdatedEvent {
  constructor(
    public readonly spaceId: SpaceId,
    public readonly documentIds: DocumentId[],
  ) {}
}
