//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';

import { Mirror } from '@dxos/echo-protocol';

import { applyOpsToDraft, decodeBatchMessage, diffToOps, encodeBatchMessage } from './automerge-ops.ts';

/** What the sequencer needs from a resident document: the current state and a way to write. */
export interface SequencedDocument {
  doc(): A.Doc<unknown>;
  change(callback: A.ChangeFn<unknown>, options: A.ChangeOptions<unknown>): void;
}

export type SubmitResult =
  | { type: 'applied'; entries: Mirror.Entry[] }
  /** The batch is older than the retained window; the tab must resubscribe from its heads. */
  | { type: 'resync'; entries: Mirror.Entry[] };

/** An entry rebuilt from Automerge history, numbered by the receiving tab. */
export type RecoveredEntry = Omit<Mirror.Entry, 'version'>;

/**
 * Orders every write to one document into entries tabs can follow. Tab batches are transformed over
 * the entries their tab had not seen and written as one Automerge change each; changes that reach
 * the document another way (network merges, replica-protocol clients) are absorbed as entries
 * computed from an Automerge diff.
 *
 * The sequencer holds no copy of the document, only a short window of entries and the heads after
 * the last one, so the worker can evict the document between writes.
 */
export class DocumentSequencer {
  readonly #sequencer: Mirror.MirrorSequencer;
  #heads: Heads;

  constructor(heads: Heads, version = 0) {
    this.#heads = heads;
    this.#sequencer = new Mirror.MirrorSequencer(version);
  }

  get version(): number {
    return this.#sequencer.version;
  }

  /** Heads after the last entry. */
  get heads(): Heads {
    return this.#heads;
  }

  /** Entries after `version`, or undefined when the window no longer reaches back that far. */
  since(version: number): Mirror.Entry[] | undefined {
    return this.#sequencer.since(version);
  }

  /** Drops entries every subscriber has integrated. */
  trim(throughVersion: number): void {
    this.#sequencer.trim(throughVersion);
  }

  /** Turns changes made outside the sequencer into an entry, if there are any. */
  absorb(doc: A.Doc<unknown>): Mirror.Entry | undefined {
    const heads = A.getHeads(doc);
    if (A.equals(heads, this.#heads)) {
      return undefined;
    }
    const ops = diffToOps(doc, this.#heads, heads);
    this.#heads = heads;
    return this.#sequencer.append({ ops, heads });
  }

  /**
   * Applies a tab's batch. Returns every entry it produced, including one absorbing changes that
   * arrived since the last entry. Throws if an op no longer fits the document, which means the
   * transforms and the document disagree.
   */
  submit(target: SequencedDocument, clientId: string, batch: Mirror.Batch): SubmitResult {
    const entries: Mirror.Entry[] = [];
    const absorbed = this.absorb(target.doc());
    if (absorbed) {
      entries.push(absorbed);
    }

    const ops = this.#sequencer.rebase(batch);
    if (!ops) {
      return { type: 'resync', entries };
    }

    let skipped = 0;
    if (ops.length > 0) {
      target.change(
        (draft) => {
          skipped = applyOpsToDraft(draft, ops);
        },
        { message: encodeBatchMessage(clientId, batch.batchId) },
      );
    }
    if (skipped > 0) {
      throw new Error(`Batch ${batch.batchId} had ${skipped} ops that did not fit the document`);
    }
    this.#heads = A.getHeads(target.doc());
    entries.push(this.#sequencer.append({ ops, heads: this.#heads, origin: { clientId, batchId: batch.batchId } }));
    return { type: 'applied', entries };
  }

  /**
   * Rebuilds, change by change, what happened after `since`, for a tab resubscribing to a worker that
   * restarted. A change written for a batch carries the batch's origin, so the tab recognizes its own
   * applied batch as acknowledged instead of sending it again. Returns undefined when the document
   * does not contain `since`, which means the tab confirmed history this worker never saved.
   */
  static recover(doc: A.Doc<unknown>, since: Heads): RecoveredEntry[] | undefined {
    if (!A.hasHeads(doc, since)) {
      return undefined;
    }
    const entries: RecoveredEntry[] = [];
    let heads = since.slice();
    for (const change of A.getChangesMetaSince(doc, since)) {
      const next = [...heads.filter((head) => !change.deps.includes(head)), change.hash].sort();
      const origin = decodeBatchMessage(change.message);
      entries.push({ ops: diffToOps(doc, heads, next), heads: next, ...(origin ? { origin } : {}) });
      heads = next;
    }
    return entries;
  }
}
