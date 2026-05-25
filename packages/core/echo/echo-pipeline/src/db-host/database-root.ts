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
    doc.change((d) => {
      if (!d.links) {
        return;
      }
      for (const [key, value] of Object.entries(d.links)) {
        const documentId = interpretAsDocumentId(value.toString() as any);
        if (mapping[documentId]) {
          d.links[key] = `automerge:${mapping[documentId]}`;
        }
      }
    });
  }

  /**
   * @param _query - Live `DocumentQuery` for the root doc. Carries both the
   * `DocHandle` (synchronously created with the query) and the actual
   * readiness state. See `getHandleState` in `@dxos/echo-pipeline` for why
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

    // .toString() to handle RawString.
    return Object.values(doc.links ?? {}).map((s) => s.toString()) as AutomergeUrl[];
  }

  measureMetrics(): DocMetrics | null {
    const doc = this.doc();
    if (!doc) {
      return null;
    }
    return measureDocMetrics(doc);
  }
}
