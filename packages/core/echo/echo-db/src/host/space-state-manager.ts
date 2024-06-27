import type { DocumentId } from '@dxos/echo-pipeline';
import { DatabaseRoot } from './database-root';
import type { SpaceId } from '@dxos/keys';
import type { DocHandle } from '@dxos/automerge/automerge-repo';
import type { SpaceDoc } from '@dxos/echo-protocol';
import { Resource } from '@dxos/context';

/**
 * Manages the database state in relation to spaces.
 */
export class SpaceStateManager extends Resource {
  private readonly _roots = new Map<DocumentId, DatabaseRoot>();
  private readonly _spaceRoots = new Map<SpaceId, DocumentId>();

  protected override async _close() {
    this._roots.clear();
    this._spaceRoots.clear();
  }

  get roots(): ReadonlyMap<DocumentId, DatabaseRoot> {
    return this._roots;
  }

  getAllRoots(): DatabaseRoot[] {
    return Array.from(this._roots.values());
  }

  async openRoot(handle: DocHandle<SpaceDoc>) {
    const existingRoot = this._roots.get(handle.documentId);
    if (existingRoot) {
      return existingRoot;
    }

    const root = new DatabaseRoot(handle);
    this._roots.set(handle.documentId, root);
    return root;
  }

  async setSpaceRoot(spaceId: SpaceId, documentId: DocumentId): Promise<void> {
    this._spaceRoots.set(spaceId, documentId);
  }
}
