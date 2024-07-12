import type { DocHandle, DocumentId } from '@dxos/automerge/automerge-repo';
import { Resource, type Context } from '@dxos/context';
import { DatabaseRoot } from './database-root';
import type { SpaceDoc } from '@dxos/echo-protocol';
import type { SpaceId } from '@dxos/keys';

export class SpaceStateManager extends Resource {
  private readonly _roots = new Map<DocumentId, DatabaseRoot>();
  private readonly _rootBySpace = new Map<SpaceId, DocumentId>();

  protected override async _close(ctx: Context): Promise<void> {
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

  assignRootToSpace(spaceId: SpaceId, rootDocumentId: DocumentId) {
    this._rootBySpace.set(spaceId, rootDocumentId);
  }
}
