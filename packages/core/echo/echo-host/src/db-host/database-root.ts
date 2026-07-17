//
// Copyright 2024 DXOS.org
//

import type * as A from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocHandle,
  type DocumentId,
  type DocumentQuery,
  interpretAsDocumentId,
} from '@automerge/automerge-repo';

import { DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

import { type DocMetrics, measureDocMetrics } from './automerge-metrics';

export class DatabaseRoot {
  static mapLinks(doc: DocHandle<DatabaseDirectory>, mapping: Record<DocumentId, DocumentId>): void {
    const remap = (url: string): string | undefined => {
      const documentId = interpretAsDocumentId(url as any);
      return mapping[documentId] ? `automerge:${mapping[documentId]}` : undefined;
    };
    doc.change((d) => {
      for (const [key, value] of Object.entries(d.links ?? {})) {
        const mapped = remap(value.toString());
        if (mapped) {
          d.links![key] = mapped;
        }
      }
      // Branch documents live in the `branches` registry, not `links`, so they must be remapped here
      // too — otherwise an imported/copied space's branches point at the source space's documents.
      for (const byName of Object.values(d.branches ?? {})) {
        for (const record of Object.values(byName)) {
          for (const [objectId, value] of Object.entries(record.members ?? {})) {
            const mapped = remap(value.toString());
            if (mapped) {
              record.members[objectId] = mapped;
            }
          }
        }
      }
    });
  }

  /**
   * @param _query - Live `DocumentQuery` for the root doc. Carries both the
   * `DocHandle` (synchronously created with the query) and the actual
   * readiness state. See `getHandleState` in `@dxos/echo-host` for why
   * we read liveness off the query rather than `DocHandle.*` predicates.
   */
  constructor(private readonly _query: DocumentQuery<DatabaseDirectory>) {}

  get documentId(): DocumentId {
    return this._query.documentId;
  }

  get url() {
    return this._query.handle.url;
  }

  get isLoaded(): boolean {
    return this._query.peek().state === 'ready';
  }

  get handle(): DocHandle<DatabaseDirectory> {
    return this._query.handle;
  }

  doc(): A.Doc<DatabaseDirectory> | null {
    return this.isLoaded ? this._query.handle.doc() : null;
  }

  getVersion(): SpaceDocVersion | null {
    const doc = this.doc();
    if (!doc) {
      return null;
    }

    return doc.version ?? SpaceDocVersion.LEGACY;
  }

  getSpaceKey(): string | null {
    const doc = this.doc();
    if (!doc) {
      return null;
    }

    return DatabaseDirectory.getSpaceKey(doc);
  }

  getInlineObjectCount(): number | null {
    const doc = this.doc();
    if (!doc) {
      return null;
    }

    return Object.keys(doc.objects ?? {}).length;
  }

  getLinkedObjectCount(): number | null {
    const doc = this.doc();
    if (!doc) {
      return null;
    }

    return Object.keys(doc.links ?? {}).length;
  }

  getAllLinkedDocuments(): AutomergeUrl[] {
    const doc = this.doc();
    invariant(doc);

    // .toString() to handle RawString. Branch documents are referenced via the `branches` registry
    // (not `links`), so they must be collected here too in order to replicate.
    return [
      ...Object.values(doc.links ?? {}).map((s) => s.toString()),
      ...DatabaseDirectory.getAllBranchDocUrls(doc),
    ] as AutomergeUrl[];
  }

  measureMetrics(): DocMetrics | null {
    const doc = this.doc();
    if (!doc) {
      return null;
    }
    return measureDocMetrics(doc);
  }
}
