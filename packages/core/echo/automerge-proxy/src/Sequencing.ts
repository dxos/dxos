//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { next as A, type Heads } from '@automerge/automerge';

import { log } from '@dxos/log';

import * as AutomergeOps from './AutomergeOps.ts';
import * as Op from './Op.ts';
import * as Sync from './Sync.ts';

/** What the sequencer needs from a resident document: the current state and a way to write. */
export interface SequencedDocument {
  doc(): A.Doc<unknown>;
  change(callback: A.ChangeFn<unknown>, options: A.ChangeOptions<unknown>): void;
}

/** A batch as it arrives over the wire, before its ops are checked. */
export type IncomingBatch = Omit<Sync.Batch, 'changes'> & { readonly changes: readonly (readonly unknown[])[] };

export type SubmitResult =
  /**
   * The batch's entry is the last of `entries`. `refused` is set when one of its changes did not fit
   * the document or held a value Automerge refuses: the changes before it were written, none after.
   */
  | { type: 'applied'; entries: Sync.Entry[]; refused?: { index: number; error: Error } }
  /** The batch is older than the retained window; the client must resubscribe from its heads. */
  | { type: 'resync'; entries: Sync.Entry[] };

/** An entry rebuilt from Automerge history, numbered by the receiving client. */
export type RecoveredEntry = Omit<Sync.Entry, 'version'>;

/**
 * Orders every write to one document into entries clients can follow. Client batches are
 * transformed over the entries their client had not seen and written as one Automerge change each;
 * changes that reach the document another way (network merges, replica-protocol clients) are
 * absorbed as entries computed from an Automerge diff.
 *
 * The sequencer holds no copy of the document, only a short window of entries and the heads after
 * the last one, so the host can evict the document between writes.
 */
export class DocumentSequencer {
  readonly #sequencer: Sync.Sequencer;
  #heads: Heads;

  constructor(heads: Heads, version = 0) {
    this.#heads = heads;
    this.#sequencer = new Sync.Sequencer(version);
  }

  get version(): number {
    return this.#sequencer.version;
  }

  /** Heads after the last entry. */
  get heads(): Heads {
    return this.#heads;
  }

  /** Entries after `version`, or undefined when the window no longer reaches back that far. */
  since(version: number): Sync.Entry[] | undefined {
    return this.#sequencer.since(version);
  }

  /** Drops entries every subscriber has integrated. */
  trim(throughVersion: number): void {
    this.#sequencer.trim(throughVersion);
  }

  /** Turns changes made outside the sequencer into an entry, if there are any. */
  absorb(doc: A.Doc<unknown>): Sync.Entry | undefined {
    const heads = A.getHeads(doc);
    if (A.equals(heads, this.#heads)) {
      return undefined;
    }
    const ops = AutomergeOps.diffToOps(doc, this.#heads, heads);
    this.#heads = heads;
    return this.#sequencer.append({ ops, heads });
  }

  /**
   * Applies a client's batch, writing its changes in order as one Automerge change and stopping at the
   * first that does not fit. Returns every entry it produced, including one absorbing changes that
   * arrived since the last entry, which the caller must send whatever the outcome.
   */
  submit(target: SequencedDocument, clientId: string, batch: IncomingBatch): SubmitResult {
    const entries: Sync.Entry[] = [];
    const absorbed = this.absorb(target.doc());
    if (absorbed) {
      entries.push(absorbed);
    }

    // A change holding a malformed op is refused whole, like one that does not fit.
    const malformed = batch.changes.findIndex((change) => !change.every(Op.is));
    const checked = batch.changes.slice(0, malformed === -1 ? undefined : malformed);
    const changes = this.#sequencer.rebase({ ...batch, changes: checked.map((change) => change.filter(Op.is)) });
    if (!changes) {
      return { type: 'resync', entries };
    }

    const { written, error } = writeChanges(target, changes, (count) =>
      AutomergeOps.encodeBatchMessage(clientId, batch.batchId, count < batch.changes.length ? count : undefined),
    );
    const refused =
      written < changes.length && error
        ? { index: written, error }
        : malformed === -1
          ? undefined
          : { index: malformed, error: new Error(`Change ${malformed} holds a malformed op`) };
    this.#heads = A.getHeads(target.doc());
    entries.push(
      this.#sequencer.append({
        ops: changes.slice(0, written).flat(),
        heads: this.#heads,
        origin: { clientId, batchId: batch.batchId, ...(refused ? { refusedAt: refused.index } : {}) },
      }),
    );
    return { type: 'applied', entries, ...(refused ? { refused } : {}) };
  }

  /** The origin recorded for the batch, or undefined when no change was written for it. Reads all change metadata. */
  static findBatch(doc: A.Doc<unknown>, batchId: string): Sync.Origin | undefined {
    for (const change of A.getChangesMetaSince(doc, [])) {
      const origin = AutomergeOps.decodeBatchMessage(change.message);
      if (origin?.batchId === batchId) {
        return origin;
      }
    }
    return undefined;
  }

  /**
   * Rebuilds, change by change, what happened after `since`, for a client resubscribing to a host that
   * restarted. A change written for a batch carries the batch's origin, so the client recognizes its own
   * applied batch as acknowledged instead of sending it again. Returns undefined when the document
   * does not contain `since`, which means the client confirmed history this host never saved.
   */
  static recover(doc: A.Doc<unknown>, since: Heads): RecoveredEntry[] | undefined {
    if (!A.hasHeads(doc, since)) {
      return undefined;
    }
    const entries: RecoveredEntry[] = [];
    let heads = since.slice();
    for (const change of A.getChangesMetaSince(doc, since)) {
      const next = [...heads.filter((head) => !change.deps.includes(head)), change.hash].sort();
      const origin = AutomergeOps.decodeBatchMessage(change.message);
      entries.push({ ops: AutomergeOps.diffToOps(doc, heads, next), heads: next, ...(origin ? { origin } : {}) });
      heads = next;
    }
    return entries;
  }
}

/** A change of a batch that did not fit the document or held a value Automerge refuses. */
class RefusedChange extends Error {
  constructor(
    readonly index: number,
    reason: unknown,
  ) {
    super(`Change ${index} was refused: ${reason instanceof Error ? reason.message : String(reason)}`, {
      cause: reason,
    });
  }
}

/**
 * Writes the leading changes that fit as one Automerge change. Automerge rolls a change back when its
 * callback throws, so a refused change is retried without, until a prefix fits. Returns how many
 * changes were written and why the next one was refused.
 */
const writeChanges = (
  target: SequencedDocument,
  changes: readonly Op.Change[],
  message: (written: number) => string,
): { written: number; error?: Error } => {
  let count = changes.length;
  let error: Error | undefined;
  while (changes.slice(0, count).some((change) => change.length > 0)) {
    const heads = A.getHeads(target.doc());
    try {
      target.change(
        (draft) => {
          for (let index = 0; index < count; index++) {
            let skipped: number;
            try {
              skipped = AutomergeOps.applyOps(draft, changes[index]);
            } catch (err) {
              throw new RefusedChange(index, err);
            }
            if (skipped > 0) {
              throw new RefusedChange(index, `${skipped} ops did not fit the document`);
            }
          }
        },
        { message: message(count) },
      );
      break;
    } catch (err) {
      if (err instanceof RefusedChange) {
        error = err;
        count = err.index;
        continue;
      }
      if (A.equals(A.getHeads(target.doc()), heads)) {
        throw err;
      }
      // A change listener threw after Automerge committed: the changes are written.
      log.catch(err);
      break;
    }
  }
  return { written: count, ...(error ? { error } : {}) };
};
