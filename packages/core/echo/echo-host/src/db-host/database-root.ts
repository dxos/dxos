//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocumentId,
  interpretAsDocumentId,
  isValidAutomergeUrl,
} from '@automerge/automerge-repo';

import { Event } from '@dxos/async';
import { DatabaseDirectory, type DirectoryJson, SpaceDocVersion } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type DocumentLease } from '../automerge/document-lease.ts';
import { type DocMetrics, measureDocMetrics } from './automerge-metrics.ts';

/** A space directory's JSON and the stored heads it was read at; see `directoryJson` in `@dxos/echo-protocol`. */
export type DirectorySnapshot = { heads: A.Heads; json: DirectoryJson };

export type DatabaseRootSource =
  | { lease: DocumentLease<DatabaseDirectory> }
  | {
      documentId: DocumentId;
      snapshot: DirectorySnapshot;
      /** Leases the root's document once it is loaded. */
      load: () => Promise<DocumentLease<DatabaseDirectory>>;
      /** Each save on the host; one for this root means the snapshot no longer shows it. */
      headsChanged: Event<{ documentId: DocumentId }>;
    };

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
      // too - otherwise an imported/copied space's branches point at the source space's documents.
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

  readonly #documentId: DocumentId;

  /** Held once the root is loaded; a root opened from a snapshot takes it on its first write or change. */
  #lease: DocumentLease<DatabaseDirectory> | undefined;

  /** What the root shows until it is loaded: its directory JSON at the heads the host stores it at. */
  #snapshot: DirectorySnapshot | undefined;

  readonly #source: DatabaseRootSource;
  #loading: Promise<void> | undefined;
  #disposed = false;
  readonly #unsubscribe: () => void;

  /** Emitted when the directory changes: each change of the loaded root, and the load that ends a snapshot. */
  readonly changed = new Event<void>();

  /**
   * A root from a lease is loaded for as long as the space is open. A root from a snapshot is read from it without
   * loading, until something writes to the root or its stored heads move; then it loads and stays loaded.
   */
  constructor(source: DatabaseRootSource) {
    this.#source = source;
    if ('lease' in source) {
      this.#documentId = source.lease.documentId;
      this.#attach(source.lease);
      this.#unsubscribe = () => {};
    } else {
      this.#documentId = source.documentId;
      this.#snapshot = source.snapshot;
      this.#unsubscribe = source.headsChanged.on(({ documentId }) => {
        if (documentId === this.#documentId && !this.#lease) {
          void this.load().catch((err) => log.warn('space root failed to load after a change', { documentId, err }));
        }
      });
    }
  }

  get documentId(): DocumentId {
    return this.#documentId;
  }

  /** Derived from the id, so a root whose lease was released still reports which document it was. */
  get url(): AutomergeUrl {
    return `automerge:${this.#documentId}` as AutomergeUrl;
  }

  /** Whether the root's Automerge document is loaded. */
  get isLoaded(): boolean {
    const lease = this.#lease;
    return lease !== undefined && !lease.disposed && lease.state === 'ready';
  }

  /** Whether the root can be read: loaded, or shown from its snapshot. */
  get isAvailable(): boolean {
    return this.isLoaded || this.#snapshot !== undefined;
  }

  /** Loads the root's document if it was opened from a snapshot; writers await it before {@link change}. */
  async load(): Promise<void> {
    if (this.#lease || this.#disposed) {
      return;
    }
    const source = this.#source;
    invariant(!('lease' in source));
    this.#loading ??= source.load().then((lease) => {
      if (this.#disposed) {
        lease[Symbol.dispose]();
        return;
      }
      this.#attach(lease);
      this.#snapshot = undefined;
      this.changed.emit();
    });
    try {
      await this.#loading;
    } finally {
      this.#loading = undefined;
    }
  }

  /**
   * The `DocHandle` stays inside the lease - a caller holding one would read and write a document the
   * host had evicted, so the operations the root needs are proxied instead.
   */
  change(callback: Parameters<DocumentLease<DatabaseDirectory>['change']>[0]): void {
    invariant(this.#lease, 'A space root opened from its snapshot must load before it is written.');
    this.#lease.change(callback);
  }

  /** Releases the root document, which is the last thing keeping the space's directory resident. */
  [Symbol.dispose](): void {
    this.#disposed = true;
    this.#unsubscribe();
    if (this.#lease) {
      this.#lease.off('change', this.#onChange);
      this.#lease[Symbol.dispose]();
    }
  }

  /** The root's directory as it reads now: the loaded document, or the snapshot it was opened from. */
  directory(): DatabaseDirectory | null {
    return this.doc() ?? this.#snapshot?.json ?? null;
  }

  /** The heads {@link directory} is read at. */
  heads(): A.Heads | null {
    const doc = this.doc();
    return doc ? A.getHeads(doc) : (this.#snapshot?.heads ?? null);
  }

  #attach(lease: DocumentLease<DatabaseDirectory>): void {
    this.#lease = lease;
    lease.on('change', this.#onChange);
  }

  readonly #onChange = (): void => this.changed.emit();

  /** The loaded Automerge document; null for a root shown from its snapshot. */
  doc(): A.Doc<DatabaseDirectory> | null {
    return this.isLoaded && this.#lease ? this.#lease.doc() : null;
  }

  getVersion(): SpaceDocVersion | null {
    const doc = this.directory();
    if (!doc) {
      return null;
    }

    return doc.version ?? SpaceDocVersion.LEGACY;
  }

  getSpaceKey(): string | null {
    const doc = this.directory();
    if (!doc) {
      return null;
    }

    return DatabaseDirectory.getSpaceKey(doc);
  }

  /** @deprecated Inline directory objects are migrated into linked documents; this counts the ones left. */
  getInlineObjectCount(): number | null {
    const doc = this.directory();
    if (!doc) {
      return null;
    }

    return Object.keys(doc.objects ?? {}).length;
  }

  getLinkedObjectCount(): number | null {
    const doc = this.directory();
    if (!doc) {
      return null;
    }

    return Object.keys(doc.links ?? {}).length;
  }

  getAllLinkedDocuments(): AutomergeUrl[] {
    const doc = this.directory();
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
