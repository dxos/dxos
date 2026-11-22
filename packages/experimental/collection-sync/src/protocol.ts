//
// Copyright 2026 DXOS.org
//

import { type Change, CHANGE_BYTES, type ChangeHash, type DocId, HASH_BYTES, type Heads } from './doc.ts';
import { type CodedSymbol, type Item, SYMBOL_BYTES } from './riblt.ts';

export type Entry = { docId: DocId; heads: Heads };

/**
 * Initiator asks for symbols `[from, from + count)` of the responder's snapshot for `round`.
 */
export type ReconcileRequest = {
  type: 'reconcile-request';
  round: string;
  from: number;
  count: number;
  /** Initiator's set size, which lower-bounds the difference and lets the responder size the first batch. */
  setSize: number;
};

export type ReconcileSymbols = {
  type: 'reconcile-symbols';
  round: string;
  from: number;
  symbols: CodedSymbol[];
  setSize: number;
};

/**
 * Initiator has decoded the difference.
 * `have` lists the initiator's docs whose heads the responder lacks; `need` lists responder items the initiator
 * lacks, which only the responder can resolve to docs.
 */
export type ReconcileDone = {
  type: 'reconcile-done';
  round: string;
  need: Item[];
  have: Entry[];
};

/**
 * Per-document sync: the sender's heads plus the changes it believes the receiver lacks.
 * A sender that cannot tell what the receiver lacks (it does not know the receiver's heads) sends no changes and
 * `have` instead, so the receiver can compute exactly what to send back.
 */
export type DocSync = {
  type: 'doc-sync';
  docId: DocId;
  heads: Heads;
  changes: Change[];
  /** Hashes the sender holds beyond the heads it shares with the receiver; a Bloom filter in Automerge. */
  have?: ChangeHash[];
};

export type Message = ReconcileRequest | ReconcileSymbols | ReconcileDone | DocSync;

export type MessageType = Message['type'];

const HEADER_BYTES = 16;

/** A Bloom filter at ~1% false positives costs ~10 bits per element. */
const BLOOM_BITS_PER_ELEMENT = 10;

const entryBytes = (entry: Entry): number => entry.docId.length + entry.heads.length * HASH_BYTES;

/** Approximate wire size, for comparing strategies. */
export const messageBytes = (message: Message): number => {
  switch (message.type) {
    case 'reconcile-request':
      return HEADER_BYTES + 12;
    case 'reconcile-symbols':
      return HEADER_BYTES + 8 + message.symbols.length * SYMBOL_BYTES;
    case 'reconcile-done':
      return (
        HEADER_BYTES + message.need.length * 8 + message.have.reduce((total, entry) => total + entryBytes(entry), 0)
      );
    case 'doc-sync':
      return (
        HEADER_BYTES +
        entryBytes(message) +
        message.changes.length * CHANGE_BYTES +
        Math.ceil(((message.have?.length ?? 0) * BLOOM_BITS_PER_ELEMENT) / 8)
      );
  }
};
