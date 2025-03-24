//
// Copyright 2024 DXOS.org
//

import type * as A from '@dxos/automerge/automerge';
import {
  interpretAsDocumentId,
  type AutomergeUrl,
  type DocHandle,
  type DocumentId,
} from '@dxos/automerge/automerge-repo';
import { type SpaceDoc, SpaceDocVersion } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

import { measureDocMetrics, type DocMetrics } from './automerge-metrics';
import { getSpaceKeyFromDoc } from '../automerge';

export class DatabaseRoot {
  static mapLinks(doc: DocHandle<SpaceDoc>, mapping: Record<DocumentId, DocumentId>): void {
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

  constructor(private readonly _rootHandle: DocHandle<SpaceDoc>) {}

  get documentId(): DocumentId {
    return this._rootHandle.documentId;
  }

  get url() {
    return this._rootHandle.url;
  }

  get isLoaded(): boolean {
    return !!this._rootHandle.docSync();
  }

  get handle(): DocHandle<SpaceDoc> {
    return this._rootHandle;
  }

  docSync(): A.Doc<SpaceDoc> | null {
    return this._rootHandle.docSync() ?? null;
  }

  getVersion(): SpaceDocVersion | null {
    const doc = this.docSync();
    if (!doc) {
      return null;
    }

    return doc.version ?? SpaceDocVersion.LEGACY;
  }

  getSpaceKey(): string | null {
    const doc = this.docSync();
    if (!doc) {
      return null;
    }

    return getSpaceKeyFromDoc(doc);
  }

  getInlineObjectCount(): number | null {
    const doc = this.docSync();
    if (!doc) {
      return null;
    }

    return Object.keys(doc.objects ?? {}).length;
  }

  getLinkedObjectCount(): number | null {
    const doc = this.docSync();
    if (!doc) {
      return null;
    }

    return Object.keys(doc.links ?? {}).length;
  }

  getAllLinkedDocuments(): AutomergeUrl[] {
    const doc = this.docSync();
    invariant(doc);

    // .toString() to handle RawString.
    return Object.values(doc.links ?? {}).map((s) => s.toString()) as AutomergeUrl[];
  }

  measureMetrics(): DocMetrics | null {
    const doc = this.docSync();
    if (!doc) {
      return null;
    }
    return measureDocMetrics(doc);
  }
}
