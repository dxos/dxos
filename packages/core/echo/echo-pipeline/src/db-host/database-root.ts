//
// Copyright 2024 DXOS.org
//

import type * as A from '@automerge/automerge';
import { type AutomergeUrl, type DocHandle, type DocumentId, interpretAsDocumentId } from '@automerge/automerge-repo';

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

  constructor(private readonly _rootHandle: DocHandle<DatabaseDirectory>) {}

  get documentId(): DocumentId {
    return this._rootHandle.documentId;
  }

  get url() {
    return this._rootHandle.url;
  }

  get isLoaded(): boolean {
    return this._rootHandle.isReady();
  }

  get handle(): DocHandle<DatabaseDirectory> {
    return this._rootHandle;
  }

  doc(): A.Doc<DatabaseDirectory> | null {
    return this._rootHandle.isReady() ? this._rootHandle.doc() : null;
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
