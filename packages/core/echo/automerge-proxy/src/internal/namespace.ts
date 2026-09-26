//
// Copyright 2026 DXOS.org
//

import * as Draft from '../Draft.ts';
import { encodeChange } from './encode.ts';
import { type Change } from './ids.ts';
import { Model } from './model.ts';
import { readChange } from './reader.ts';
import { TabDoc, type TabDocument, type Tag, tagOf } from './tab-doc.ts';

type Heads = string[];
type Path = (string | number)[];
/** Automerge's callback, whose draft has a shape only the caller knows. */
type ChangeFn = (draft: unknown) => void;
type ChangeOptions = string | { message?: string; time?: number };
type InitOptions = string | { actor?: string };

/** Calls the real Automerge function `name`, for anything that is not a tab document. */
export type Fallback = (name: string, ...args: unknown[]) => unknown;

/** The functions of Automerge's namespace the spike answers for tab documents. */
type Api = {
  isProxy: (doc: unknown) => boolean;
  getHeads: (doc: unknown) => unknown;
  hasHeads: (doc: unknown, heads: Heads) => unknown;
  diff: (doc: unknown, before: Heads, after: Heads) => unknown;
  view: (doc: unknown, heads: Heads) => unknown;
  splice: (doc: unknown, path: Path, index: number, del: number, text?: string) => void;
  updateText: (doc: unknown, path: Path, text: string) => void;
  getCursor: (doc: unknown, path: Path, position: number, move?: 'before' | 'after') => unknown;
  getCursorPosition: (doc: unknown, path: Path, cursor: string) => unknown;
  getConflicts: (doc: unknown, prop: string | number) => unknown;
  getHistory: (doc: unknown) => unknown;
  getChangesMetaSince: (doc: unknown, heads: Heads) => unknown;
  toJS: (doc: unknown) => unknown;
  from: (initial: Record<string, unknown>, options?: InitOptions) => unknown;
  init: (options?: InitOptions) => unknown;
  load: (bytes: Uint8Array, options?: InitOptions) => unknown;
  decodeChange: (bytes: Uint8Array) => unknown;
  change: (doc: unknown, options: ChangeOptions | ChangeFn, fn?: ChangeFn) => unknown;
  changeAt: (doc: unknown, heads: Heads, options: ChangeOptions | ChangeFn, fn?: ChangeFn) => unknown;
  applyChanges: (doc: unknown, changes: Uint8Array[], options?: unknown) => unknown;
  merge: (target: unknown, source: unknown) => unknown;
  clone: (doc: unknown, options?: InitOptions) => unknown;
  save: (doc: unknown) => unknown;
  getAllChanges: (doc: unknown) => unknown;
  getChanges: (before: unknown, after: unknown) => unknown;
  getLastLocalChange: (doc: unknown) => unknown;
  getActorId: (doc: unknown) => unknown;
  getBackend: (doc: unknown) => unknown;
};

/** Calls that reached real Automerge with a tab document; any is a bug the tests assert against. */
export const leaks: string[] = [];

let realm: 'worker' | 'tab' = 'worker';

/**
 * Runs `fn` as code in a tab. The calls that make a document from nothing (`from`, `init`, `load`)
 * and `decodeChange` have no document to say which realm they serve; the worker and the tabs share
 * one module registry in tests, so this marks the tab's side.
 */
export const asTab = <T>(fn: () => T): T => {
  const previous = realm;
  realm = 'tab';
  try {
    return fn();
  } finally {
    realm = previous;
  }
};

const actorOf = (options?: InitOptions): string | undefined => (typeof options === 'string' ? options : options?.actor);

const changeArgs = (
  options: ChangeOptions | ChangeFn,
  fn?: ChangeFn,
): [ChangeFn, { message?: string; time?: number }] => {
  if (typeof options === 'function') {
    return [options, {}];
  }
  if (!fn) {
    throw new TypeError('A change needs a callback');
  }
  return [fn, typeof options === 'string' ? { message: options } : options];
};

/** A tab document's root at the tab's current version: Automerge refuses to change any other. */
const current = (tag: Tag): TabDocument => {
  if (tag.path.length > 0 || tag.heads.join() !== tag.tab.heads().join()) {
    throw new RangeError(
      'Attempting to change an outdated document.  Use Automerge.clone() if you wish to make a writable copy.',
    );
  }
  return tag.tab;
};

const bytesOf = (changes: readonly Change[]): Uint8Array[] => changes.map((change) => encodeChange(change).bytes);

const asBytes = (value: unknown): Uint8Array[] =>
  Array.isArray(value) ? value.filter((item): item is Uint8Array => item instanceof Uint8Array) : [];

const first = (value: unknown): unknown => (Array.isArray(value) ? value[0] : undefined);

const decode = (bytes: Uint8Array): Change => {
  const { end: _end, ...change } = readChange(bytes);
  return change;
};

/**
 * Overrides for Automerge's namespace: a tab document answers from its model, anything else falls
 * through to `actual`. Tests install them with `vi.mock` so unmodified code runs over tab documents.
 */
export const spikeOverrides = (actual: Fallback): Api => {
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
      return tag ? [...tag.heads] : actual('getHeads', doc);
    },
    hasHeads: (doc, heads) => {
      const tag = tagOf(doc);
      return tag
        ? heads.every((head) => tag.tab.model.hasChange(head) && tag.tab.model.reaches(tag.heads, head))
        : actual('hasHeads', doc, heads);
    },
    diff: (doc, before, after) => {
      const tag = tagOf(doc);
      return tag ? tag.tab.diff(before, after) : actual('diff', doc, before, after);
    },
    view: (doc, heads) => {
      const tag = tagOf(doc);
      return tag ? tag.tab.view(heads) : actual('view', doc, heads);
    },
    splice: (doc, path, index, del, text) => {
      if (!Draft.splice(doc, path, index, del, text ?? '')) {
        guard('splice', doc, () => actual('splice', doc, path, index, del, text));
      }
    },
    updateText: (doc, path, text) => {
      if (!Draft.updateText(doc, path, text)) {
        guard('updateText', doc, () => actual('updateText', doc, path, text));
      }
    },
    getCursor: (doc, path, position, move) => {
      const tag = tagOf(doc);
      return tag
        ? tag.tab.cursor(tag.heads, [...tag.path, ...path], position, move)
        : actual('getCursor', doc, path, position, move);
    },
    getCursorPosition: (doc, path, cursor) => {
      const tag = tagOf(doc);
      return tag
        ? tag.tab.cursorPosition(tag.heads, [...tag.path, ...path], cursor)
        : actual('getCursorPosition', doc, path, cursor);
    },
    getConflicts: (doc, prop) => {
      const tag = tagOf(doc);
      return tag ? tag.tab.conflicts(tag.heads, tag.path, prop) : actual('getConflicts', doc, prop);
    },
    getHistory: (doc) => {
      const tag = tagOf(doc);
      return tag ? historyOf(tag.tab, tag.heads) : actual('getHistory', doc);
    },
    getChangesMetaSince: (doc, heads) => {
      const tag = tagOf(doc);
      if (!tag) {
        return actual('getChangesMetaSince', doc, heads);
      }
      const model = tag.tab.model;
      const seen = heads.length > 0 ? model.clockOf(heads) : new Map<string, number>();
      return model.changesIn(tag.heads).flatMap((hash) => {
        const meta = model.changeMeta(hash);
        return meta && meta.maxOp > (seen.get(meta.actor) ?? 0)
          ? [{ hash, ...meta, author: null, extraBytes: null }]
          : [];
      });
    },
    toJS: (doc) => {
      const tag = tagOf(doc);
      return tag ? structuredClone(doc) : actual('toJS', doc);
    },

    //
    // Documents made from nothing are tab documents in a tab.
    //

    from: (initial, options) =>
      realm === 'tab' ? TabDoc.create(initial, { actor: actorOf(options) }).doc() : actual('from', initial, options),
    init: (options) =>
      realm === 'tab' ? new TabDoc(new Model(), [], { actor: actorOf(options) }).doc() : actual('init', options),
    load: (bytes, options) =>
      realm === 'tab' ? TabDoc.load(bytes, { actor: actorOf(options) }).doc() : actual('load', bytes, options),
    decodeChange: (bytes) => (realm === 'tab' ? decode(bytes) : actual('decodeChange', bytes)),

    //
    // Writes.
    //

    change: (doc, options, fn) => {
      const tag = tagOf(doc);
      if (!tag) {
        return actual('change', doc, options, fn);
      }
      const tab = current(tag);
      const [callback, changeOptions] = changeArgs(options, fn);
      tab.change(callback, changeOptions);
      return tab.doc();
    },
    changeAt: (doc, heads, options, fn) => {
      const tag = tagOf(doc);
      if (!tag) {
        return actual('changeAt', doc, heads, options, fn);
      }
      const tab = current(tag);
      const [callback, changeOptions] = changeArgs(options, fn);
      const newHeads = tab.changeAt(heads, callback, changeOptions) ?? null;
      return { newDoc: tab.doc(), newHeads };
    },
    applyChanges: (doc, changes, options) => {
      const tag = tagOf(doc);
      if (!tag) {
        return actual('applyChanges', doc, changes, options);
      }
      const tab = current(tag);
      tab.applyChanges(changes.map(decode));
      return [tab.doc()];
    },
    merge: (target, source) => {
      const tag = tagOf(target);
      const sourceTag = tagOf(source);
      if (!tag) {
        return sourceTag
          ? first(actual('applyChanges', target, bytesOf(sourceTag.tab.changesIn(sourceTag.heads))))
          : actual('merge', target, source);
      }
      const tab = current(tag);
      tab.applyChanges(
        sourceTag ? sourceTag.tab.changesIn(sourceTag.heads) : asBytes(actual('getAllChanges', source)).map(decode),
      );
      return tab.doc();
    },
    clone: (doc, options) => {
      const tag = tagOf(doc);
      return tag
        ? TabDoc.fromChanges(tag.tab.changesIn(tag.heads), { actor: actorOf(options) }).doc()
        : actual('clone', doc, options);
    },

    //
    // Changes and bytes: every change a tab holds encodes to the bytes of its hash.
    //

    // Change chunks back to back, which `A.load` and `repo.import` take as they take a saved document.
    save: (doc) => {
      const tag = tagOf(doc);
      if (!tag) {
        return actual('save', doc);
      }
      const chunks = bytesOf(tag.tab.changesIn(tag.heads));
      const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
      return out;
    },
    getAllChanges: (doc) => {
      const tag = tagOf(doc);
      return tag ? bytesOf(tag.tab.changesIn(tag.heads)) : actual('getAllChanges', doc);
    },
    getChanges: (before, after) => {
      const tag = tagOf(after);
      if (!tag) {
        return actual('getChanges', before, after);
      }
      const beforeTag = tagOf(before);
      const have = new Set(
        beforeTag
          ? beforeTag.tab.model.changesIn(beforeTag.heads)
          : asBytes(actual('getAllChanges', before)).map((bytes) => decode(bytes).hash),
      );
      return bytesOf(tag.tab.changesIn(tag.heads).filter((change) => !have.has(change.hash)));
    },
    getLastLocalChange: (doc) => {
      const tag = tagOf(doc);
      if (!tag) {
        return actual('getLastLocalChange', doc);
      }
      const change = tag.tab.lastLocalChange();
      return change ? encodeChange(change).bytes : undefined;
    },
    getActorId: (doc) => {
      const tag = tagOf(doc);
      return tag ? tag.tab.actor : actual('getActorId', doc);
    },
    // Only what ECHO asks of the backend: change metadata by hash, for `updatedAt`.
    getBackend: (doc) => {
      const tag = tagOf(doc);
      if (!tag) {
        return actual('getBackend', doc);
      }
      return {
        getHeads: () => [...tag.heads],
        getChangeMetaByHash: (hash: string) => {
          const meta = tag.tab.model.changeMeta(hash);
          return meta ? { hash, ...meta } : undefined;
        },
      };
    },
  };
};

/** Wraps each function of `actual` the overrides leave alone, so a tab document reaching one is recorded. */
export const watchLeaks = (actual: Record<string, unknown>, overridden: object): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === 'function' && !(name in overridden) && !/^[A-Z]/.test(name)
        ? (...args: unknown[]) => {
            if (args.some((arg) => tagOf(arg) !== undefined)) {
              leaks.push(name);
            }
            return value(...args);
          }
        : value,
    ]),
  );

/** `A.getHistory` for a tab document: each change with the document after the changes up to it. */
export const historyOf = (
  tab: TabDocument,
  heads: readonly string[],
): {
  change: { hash: string; actor: string; seq: number; time: number; message: string | null; deps: string[] };
  snapshot: unknown;
}[] => {
  const hashes = tab.model.changesIn(heads);
  return hashes.flatMap((hash, index) => {
    const meta = tab.model.changeMeta(hash);
    return meta
      ? [
          {
            change: { hash, actor: meta.actor, seq: meta.seq, time: meta.time, message: meta.message, deps: meta.deps },
            get snapshot() {
              return tab.view(hashes.slice(0, index + 1));
            },
          },
        ]
      : [];
  });
};
