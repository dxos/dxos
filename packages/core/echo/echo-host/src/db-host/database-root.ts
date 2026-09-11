//
// Copyright 2024 DXOS.org
//

import type * as A from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocHandle,
  type DocumentId,
  interpretAsDocumentId,
  isValidAutomergeUrl,
} from '@automerge/automerge-repo';

import { DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

import { type DocumentLease } from '../automerge/document-lease.ts';
import { type DocMetrics, measureDocMetrics } from './automerge-metrics.ts';

export class DatabaseRoot implements Disposable {
  static mapLinks(document: DocumentLease<DatabaseDirectory>, mapping: Record<DocumentId, DocumentId>): void {
    const remap = (url: string): string | undefined => {
      if (!isValidAutomergeUrl(url)) {
        return undefined;
      }
      const documentId = interpretAsDocumentId(url);
      return mapping[documentId] ? `automerge:${mapping[documentId]}` : undefined;
    };
    document.change((draft) => {
      for (const [key, value] of Object.entries(draft.links ?? {})) {
        const mapped = remap(value.toString());
        if (mapped && draft.links) {
          draft.links[key] = mapped;
        }
      }
      // Branch documents live in the `branches` registry, not `links`, so they must be remapped here
      // too — otherwise an imported/copied space's branches point at the source space's documents.
      for (const byName of Object.values(draft.branches ?? {})) {
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
   * @param _lease - Lease on the root doc, held for as long as the space is open. Carries both the
   * `DocHandle` and the actual readiness state — see `getHandleState` in `@dxos/echo-host` for why
   * we read liveness off the query rather than `DocHandle.*` predicates.
   */
  constructor(private readonly _lease: DocumentLease<DatabaseDirectory>) {}

  get documentId(): DocumentId {
    return this._lease.documentId;
  }

  /** Derived from the id, so a root whose lease was released still reports which document it was. */
  get url(): AutomergeUrl {
    return `automerge:${this._lease.documentId}` as AutomergeUrl;
  }

  get isLoaded(): boolean {
    return !this._lease.disposed && this._lease.state === 'ready';
  }

  /**
   * The `DocHandle` stays inside the lease — a caller holding one would read and write a document the
   * host had evicted, so the operations the root needs are proxied instead.
   */
  change(callback: Parameters<DocumentLease<DatabaseDirectory>['change']>[0]): void {
    this._lease.change(callback);
  }

  on(...args: Parameters<DocumentLease<DatabaseDirectory>['on']>): void {
    this._lease.on(...args);
  }

  off(...args: Parameters<DocumentLease<DatabaseDirectory>['off']>): void {
    this._lease.off(...args);
  }

  /** Releases the root document, which is the last thing keeping the space's directory resident. */
  [Symbol.dispose](): void {
    this._lease[Symbol.dispose]();
  }

  doc(): A.Doc<DatabaseDirectory> | null {
    return this.isLoaded ? this._lease.doc() : null;
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
