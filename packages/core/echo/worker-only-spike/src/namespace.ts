//
// Copyright 2026 DXOS.org
//

import * as Draft from '@dxos/automerge-proxy/Draft';

import { type TabDoc, tagOf } from './tab.ts';

/** The parts of Automerge's API the spike answers for tab documents. */
type Api = {
  getHeads: (doc: any) => string[];
  hasHeads: (doc: any, heads: string[]) => boolean;
  diff: (doc: any, before: string[], after: string[]) => unknown[];
  view: (doc: any, heads: string[]) => any;
  splice: (doc: any, path: any[], index: any, del: number, text?: string) => void;
  updateText: (doc: any, path: any[], text: string) => void;
  getCursor: (doc: any, path: any[], position: number, move?: any) => string;
  getCursorPosition: (doc: any, path: any[], cursor: string) => number;
  getConflicts: (doc: any, prop: any) => any;
  getHistory: (doc: any) => any[];
  getChangesMetaSince: (doc: any, heads: string[]) => any[];
  toJS: (doc: any) => any;
};

/** Calls that reached real Automerge with a tab document; any is a bug the tests assert against. */
export const leaks: string[] = [];

/**
 * Overrides for Automerge's namespace: a tab document answers from its model, anything else falls
 * through to `actual`. Tests install them with `vi.mock` so unmodified code runs over tab documents.
 */
export const spikeOverrides = <T extends Api>(actual: T): Api & { isProxy: (doc: unknown) => boolean } => {
  const guard = <R>(name: string, doc: unknown, call: () => R): R => {
    if (tagOf(doc) !== undefined) {
      leaks.push(name);
    }
    return call();
  };
  return {
    // A tab document is not one of today's mirror documents: code takes its Automerge path.
    isProxy: () => false,
    getHeads: (doc) => {
      const tag = tagOf(doc);
      return tag ? [...tag.heads] : actual.getHeads(doc);
    },
    hasHeads: (doc, heads) => {
      const tag = tagOf(doc);
      return tag
        ? heads.every((head) => tag.tab.model.hasChange(head) && tag.tab.model.reaches(tag.heads, head))
        : actual.hasHeads(doc, heads);
    },
    diff: (doc, before, after) => {
      const tag = tagOf(doc);
      return tag ? tag.tab.diff(before, after) : actual.diff(doc, before, after);
    },
    view: (doc, heads) => {
      const tag = tagOf(doc);
      return tag ? tag.tab.view(heads) : actual.view(doc, heads);
    },
    splice: (doc, path, index, del, text) => {
      if (!Draft.splice(doc, path, index, del, text ?? '')) {
        guard('splice', doc, () => actual.splice(doc, path, index, del, text));
      }
    },
    updateText: (doc, path, text) => {
      if (!Draft.updateText(doc, path, text)) {
        guard('updateText', doc, () => actual.updateText(doc, path, text));
      }
    },
    getCursor: (doc, path, position, move) => {
      const tag = tagOf(doc);
      return tag
        ? tag.tab.cursor(tag.heads, [...tag.path, ...path], position, move)
        : actual.getCursor(doc, path, position, move);
    },
    getCursorPosition: (doc, path, cursor) => {
      const tag = tagOf(doc);
      return tag
        ? tag.tab.cursorPosition(tag.heads, [...tag.path, ...path], cursor)
        : actual.getCursorPosition(doc, path, cursor);
    },
    getConflicts: (doc, prop) => {
      const tag = tagOf(doc);
      return tag ? tag.tab.conflicts(tag.heads, tag.path, prop) : actual.getConflicts(doc, prop);
    },
    getHistory: (doc) => {
      const tag = tagOf(doc);
      return tag ? historyOf(tag.tab) : actual.getHistory(doc);
    },
    getChangesMetaSince: (doc, heads) => {
      const tag = tagOf(doc);
      if (!tag) {
        return actual.getChangesMetaSince(doc, heads);
      }
      const model = tag.tab.model;
      const seen = heads.length > 0 ? model.clockOf(heads) : new Map<string, number>();
      return model
        .changeHashes()
        .filter((hash) => model.reaches(tag.heads, hash))
        .map((hash) => ({ hash, ...model.changeMeta(hash)! }))
        .filter((meta) => meta.maxOp > (seen.get(meta.actor) ?? 0))
        .map(({ hash, actor, seq, startOp, maxOp, time, message, deps }) => ({
          hash,
          actor,
          seq,
          startOp,
          maxOp,
          time,
          message,
          deps,
          author: null,
          extraBytes: null,
        }));
    },
    toJS: (doc) => {
      const tag = tagOf(doc);
      return tag ? structuredClone(doc) : actual.toJS(doc);
    },
  };
};

/** `A.getHistory` for a tab document: each change with the document after the changes up to it. */
export const historyOf = (
  tab: TabDoc,
): {
  change: { hash: string; actor: string; seq: number; time: number; message: string | null; deps: string[] };
  snapshot: any;
}[] => {
  const hashes = tab.model.changeHashes();
  return hashes.map((hash, index) => {
    const meta = tab.model.changeMeta(hash)!;
    return {
      change: { hash, actor: meta.actor, seq: meta.seq, time: meta.time, message: meta.message, deps: meta.deps },
      get snapshot() {
        return tab.view(hashes.slice(0, index + 1));
      },
    };
  });
};
