//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';

import { Event } from '@dxos/async';

type Entry = {
  /** Order of the latest save, compared against where a pass started. */
  sequence: number;
  /** Whether the index has never read the document; undefined until {@link UnindexedDocuments.classify} says. */
  unread?: boolean;
};

/**
 * Documents saved since the index last drained. Those the index has never read have no rows at all, so a query
 * reads them from disk rather than leave their objects out until a pass reaches them; a document the index has
 * read is answered from its rows, which a pass brings up to date and then invalidates.
 *
 * Errs towards keeping a document: one indexed by a pass that started before its save is cleared by the next
 * drained pass, which costs a disk read, never a missing result.
 */
export class UnindexedDocuments {
  #sequence = 0;
  readonly #saved = new Map<DocumentId, Entry>();

  /** A document joined the set and needs {@link classify}. */
  readonly added = new Event<DocumentId>();

  get size(): number {
    return this.#saved.size;
  }

  /** Documents the index has never read that `inSpace` accepts. */
  unread(inSpace: (documentId: DocumentId) => boolean): DocumentId[] {
    const documentIds: DocumentId[] = [];
    for (const [documentId, entry] of this.#saved) {
      if (entry.unread && inSpace(documentId)) {
        documentIds.push(documentId);
      }
    }
    return documentIds;
  }

  /** Documents still waiting for {@link classify} that `inSpace` accepts. */
  unclassified(inSpace: (documentId: DocumentId) => boolean): DocumentId[] {
    const documentIds: DocumentId[] = [];
    for (const [documentId, entry] of this.#saved) {
      if (entry.unread === undefined && inSpace(documentId)) {
        documentIds.push(documentId);
      }
    }
    return documentIds;
  }

  markSaved(documentId: DocumentId): void {
    const entry = this.#saved.get(documentId);
    if (entry) {
      entry.sequence = ++this.#sequence;
      return;
    }
    this.#saved.set(documentId, { sequence: ++this.#sequence });
    this.added.emit(documentId);
  }

  /** Records whether the index has read the document; false once a drained pass already cleared it. */
  classify(documentId: DocumentId, unread: boolean): boolean {
    const entry = this.#saved.get(documentId);
    if (!entry) {
      return false;
    }
    entry.unread = unread;
    return true;
  }

  /** Records where a pass starts; pass the result to {@link endPass}. */
  beginPass(): number {
    return this.#sequence;
  }

  /** A drained pass indexed everything saved before it started. */
  endPass(startedAt: number, drained: boolean): void {
    if (!drained) {
      return;
    }
    for (const [documentId, entry] of this.#saved) {
      if (entry.sequence <= startedAt) {
        this.#saved.delete(documentId);
      }
    }
  }
}
