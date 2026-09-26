//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import '#automerge-realm';

import type * as Automerge from '@automerge/automerge';

import * as Draft from './Draft.ts';
import { encodeChange as encodeTabChange } from './internal/encode.ts';
import { type Change } from './internal/ids.ts';
import { Model } from './internal/model.ts';
import { readChange } from './internal/reader.ts';
import {
  type AutomergeModule,
  TabDocumentUnsupportedError,
  getRegistered,
  register,
  requireRegistered,
} from './internal/registry.ts';
import { TabDoc, type TabDocument, tagOf } from './internal/tab-doc.ts';
import {
  TabCounter,
  TabFloat64,
  TabImmutableString,
  TabInt,
  TabUint,
  isCounter as isTabCounter,
  isImmutableString as isTabImmutableString,
  equals as valuesEqual,
} from './internal/values.ts';

//
// Automerge's API over tab documents and Automerge documents alike. A function that takes a document
// answers from the tab document when the argument is one, and otherwise calls the Automerge this realm
// registered. Nothing here imports Automerge at runtime: a tab that holds only tab documents never
// loads its WebAssembly.
//

export type * from '@automerge/automerge';

export { AutomergeNotRegisteredError, TabDocumentUnsupportedError } from './internal/registry.ts';

/**
 * Makes `automerge` answer for every document that is not a tab document. A browser or worker realm
 * that holds Automerge documents calls it once its WebAssembly is ready; Node registers on import.
 */
export const registerAutomerge = register;

type Doc<T> = Automerge.Doc<T>;
type Heads = Automerge.Heads;
type ChangeArgument<T> = string | Automerge.ChangeOptions<T> | Automerge.ChangeFn<T>;

/** Where a value a tab document handed out sits: the document, the version, and the path there. */
type TabTag<T> = {
  readonly tab: TabDocument<T>;
  readonly heads: string[];
  readonly path: readonly (string | number)[];
};

const tabOf = <T>(doc: Doc<T>): TabTag<T> | undefined =>
  // A tagged value belongs to the tab document that tagged it, whose shape its caller claims, as with `A.load<T>`.
  tagOf(doc) as TabTag<T> | undefined;

const anyTab = (values: readonly unknown[]): boolean => values.some((value) => tagOf(value) !== undefined);

/** A tab document's root at its current version: Automerge refuses to change any other. */
const current = <T>(tag: TabTag<T>): TabDocument<T> => {
  if (tag.path.length > 0 || tag.heads.join() !== tag.tab.heads().join()) {
    throw new RangeError(
      'Attempting to change an outdated document.  Use Automerge.clone() if you wish to make a writable copy.',
    );
  }
  return tag.tab;
};

const actorOf = <T>(options?: string | Automerge.InitOptions<T>): string | undefined =>
  typeof options === 'string' ? options : options?.actor;

const changeArguments = <T>(
  options: ChangeArgument<T>,
  callback?: Automerge.ChangeFn<T>,
): [Automerge.ChangeFn<T>, { message?: string; time?: number }] => {
  if (typeof options === 'function') {
    return [options, {}];
  }
  if (!callback) {
    throw new TypeError('A change needs a callback');
  }
  if (typeof options === 'string') {
    return [callback, { message: options }];
  }
  return [
    callback,
    {
      ...(options.message !== undefined ? { message: options.message } : {}),
      ...(options.time !== undefined ? { time: options.time } : {}),
    },
  ];
};

const decode = (bytes: Uint8Array): Change => {
  const { end: _end, ...change } = readChange(bytes);
  return change;
};

/** Change chunks back to back, or a saved document, as `A.load` and `A.loadIncremental` take them. */
const decodeAll = (bytes: Uint8Array): Change[] => {
  // The chunk type follows the magic bytes and the checksum; 0 is a saved document.
  if (bytes[8] === 0) {
    const model = Model.fromSaved(bytes);
    return model.changeHashes().map((hash) => model.changeOf(hash));
  }
  const changes: Change[] = [];
  for (let offset = 0; offset < bytes.length;) {
    const { end, ...change } = readChange(bytes, offset);
    changes.push(change);
    offset = end;
  }
  return changes;
};

const bytesOf = (changes: readonly Change[]): Uint8Array[] => changes.map((change) => encodeTabChange(change).bytes);

const concat = (chunks: readonly Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
};

/** A change as `A.decodeChange` gives it. */
const toDecoded = (change: Change): Automerge.DecodedChange => ({
  ...change,
  author: null,
  // Automerge's decoder gives ops its `Op` type leaves out: a sequence op has `elemId` and `insert`
  // instead of `key`, and a value keeps its bytes. This gives the same.
  ops: change.ops as Automerge.DecodedChange['ops'],
});

const metadataOf = (tab: TabDocument, hash: string): Automerge.ChangeMetadata | undefined => {
  const meta = tab.model.changeMeta(hash);
  return meta && { ...meta, hash, author: null, extraBytes: null };
};

/** The changes of the version at `heads` that `have` does not reach, in causal order. */
const changesSince = (tag: TabTag<unknown>, have: Heads): Change[] => {
  const known = new Set(have.length > 0 ? tag.tab.model.changesIn(have) : []);
  return tag.tab.changesIn(tag.heads).filter((change) => !known.has(change.hash));
};

const unsupported = (name: string, values: readonly unknown[]): void => {
  if (anyTab(values)) {
    throw new TabDocumentUnsupportedError(name);
  }
};

//
// Values.
//

// The tab's value classes carry Automerge's registered symbols, which is how Automerge recognizes a
// value, and each class's `instanceof` matches the other's instances; only the declared types differ.
export const ImmutableString = TabImmutableString as typeof Automerge.ImmutableString;
export type ImmutableString = Automerge.ImmutableString;
export const RawString = ImmutableString;
export type RawString = Automerge.ImmutableString;
export const Counter = TabCounter as typeof Automerge.Counter;
export type Counter = Automerge.Counter;
export const Int = TabInt as typeof Automerge.Int;
export type Int = Automerge.Int;
export const Uint = TabUint as typeof Automerge.Uint;
export type Uint = Automerge.Uint;
export const Float64 = TabFloat64 as typeof Automerge.Float64;
export type Float64 = Automerge.Float64;

export const isImmutableString: AutomergeModule['isImmutableString'] = (value): value is ImmutableString =>
  isTabImmutableString(value);
export const isRawString = isImmutableString;
export const isCounter: AutomergeModule['isCounter'] = (value): value is Counter => isTabCounter(value);
export const equals: AutomergeModule['equals'] = (left, right) => valuesEqual(left, right);

//
// Documents made from nothing are tab documents in a realm that registered no Automerge.
//

export const from: AutomergeModule['from'] = <T extends Record<string, unknown>>(
  initialState: T | Doc<T>,
  options?: string | Automerge.InitOptions<T>,
) => {
  const automerge = getRegistered();
  return automerge
    ? automerge.from(initialState, options)
    : TabDoc.create<T>(initialState, { actor: actorOf(options) }).doc();
};

export const init: AutomergeModule['init'] = <T>(options?: string | Automerge.InitOptions<T>) => {
  const automerge = getRegistered();
  return automerge ? automerge.init<T>(options) : TabDoc.fromChanges<T>([], { actor: actorOf(options) }).doc();
};

export const load: AutomergeModule['load'] = <T>(data: Uint8Array, options?: string | Automerge.InitOptions<T>) => {
  const automerge = getRegistered();
  return automerge ? automerge.load<T>(data, options) : TabDoc.load<T>(data, { actor: actorOf(options) }).doc();
};

export const decodeChange: AutomergeModule['decodeChange'] = (data) => {
  const automerge = getRegistered();
  return automerge ? automerge.decodeChange(data) : toDecoded(decode(data));
};

export const encodeChange: AutomergeModule['encodeChange'] = (change) =>
  requireRegistered('encodeChange').encodeChange(change);

//
// Reads.
//

export const getHeads: AutomergeModule['getHeads'] = (doc) => {
  const tag = tagOf(doc);
  return tag ? [...tag.heads] : requireRegistered('getHeads').getHeads(doc);
};

export const hasHeads: AutomergeModule['hasHeads'] = (doc, heads) => {
  const tag = tagOf(doc);
  return tag
    ? heads.every((head) => tag.tab.model.hasChange(head) && tag.tab.model.reaches(tag.heads, head))
    : requireRegistered('hasHeads').hasHeads(doc, heads);
};

export const getMissingDeps: AutomergeModule['getMissingDeps'] = (doc, heads) => {
  const tag = tagOf(doc);
  return tag
    ? heads.filter((head) => !tag.tab.model.hasChange(head))
    : requireRegistered('getMissingDeps').getMissingDeps(doc, heads);
};

export const view: AutomergeModule['view'] = (doc, heads) => {
  const tag = tabOf(doc);
  return tag ? tag.tab.view(heads) : requireRegistered('view').view(doc, heads);
};

export const diff: AutomergeModule['diff'] = (doc, before, after) => {
  const tag = tagOf(doc);
  return tag ? tag.tab.diff(before, after) : requireRegistered('diff').diff(doc, before, after);
};

export const toJS: AutomergeModule['toJS'] = <T>(doc: Doc<T>): T => {
  const tag = tabOf(doc);
  // The copy has the shape the caller claims for the value, as Automerge's does.
  return tag ? (tag.tab.copy(tag.heads, tag.path) as T) : requireRegistered('toJS').toJS(doc);
};

export const getObjectId: AutomergeModule['getObjectId'] = (doc, prop) => {
  const tag = tagOf(doc);
  if (!tag) {
    return requireRegistered('getObjectId').getObjectId(doc, prop);
  }
  return tag.tab.objectId(tag.heads, prop === undefined ? tag.path : [...tag.path, prop]) ?? null;
};

export const getConflicts: AutomergeModule['getConflicts'] = (doc, prop) => {
  const tag = tagOf(doc);
  if (!tag) {
    return requireRegistered('getConflicts').getConflicts(doc, prop);
  }
  // The model materializes each conflicting value as Automerge does.
  return tag.tab.conflicts(tag.heads, tag.path, prop) as Automerge.Conflicts | undefined;
};

export const getCursor: AutomergeModule['getCursor'] = (doc, path, position, move) => {
  const tag = tagOf(doc);
  if (!tag) {
    return requireRegistered('getCursor').getCursor(doc, path, position, move);
  }
  const index = position === 'start' ? -1 : position === 'end' ? Number.POSITIVE_INFINITY : position;
  return tag.tab.cursor(tag.heads, [...tag.path, ...path], index, move);
};

export const getCursorPosition: AutomergeModule['getCursorPosition'] = (doc, path, cursor) => {
  const tag = tagOf(doc);
  return tag
    ? tag.tab.cursorPosition(tag.heads, [...tag.path, ...path], cursor)
    : requireRegistered('getCursorPosition').getCursorPosition(doc, path, cursor);
};

export const getActorId: AutomergeModule['getActorId'] = (doc) => {
  const tag = tagOf(doc);
  return tag ? tag.tab.actor : requireRegistered('getActorId').getActorId(doc);
};

export const getHistory: AutomergeModule['getHistory'] = <T>(doc: Doc<T>): Automerge.State<T>[] => {
  const tag = tabOf(doc);
  if (!tag) {
    return requireRegistered('getHistory').getHistory(doc);
  }
  const { tab } = tag;
  const hashes = tab.model.changesIn(tag.heads);
  return hashes.map((hash, index) => ({
    change: toDecoded(tab.model.changeOf(hash)),
    get snapshot() {
      return tab.view(hashes.slice(0, index + 1));
    },
  }));
};

export const getChangesMetaSince: AutomergeModule['getChangesMetaSince'] = (doc, heads) => {
  const tag = tabOf(doc);
  if (!tag) {
    return requireRegistered('getChangesMetaSince').getChangesMetaSince(doc, heads);
  }
  return changesSince(tag, heads).flatMap((change) => metadataOf(tag.tab, change.hash) ?? []);
};

export const inspectChange: AutomergeModule['inspectChange'] = (doc, hash) => {
  const tag = tagOf(doc);
  if (!tag) {
    return requireRegistered('inspectChange').inspectChange(doc, hash);
  }
  return tag.tab.model.hasChange(hash) ? toDecoded(tag.tab.model.changeOf(hash)) : null;
};

export const topoHistoryTraversal: AutomergeModule['topoHistoryTraversal'] = (doc) => {
  const tag = tagOf(doc);
  return tag ? tag.tab.model.changesIn(tag.heads) : requireRegistered('topoHistoryTraversal').topoHistoryTraversal(doc);
};

export const isAutomerge: AutomergeModule['isAutomerge'] = (doc) => {
  if (tagOf(doc)) {
    // A tab document answers everything ECHO asks of an Automerge document.
    return true;
  }
  return getRegistered()?.isAutomerge(doc) ?? false;
};

/**
 * Automerge's backend handle. A tab document has none; ECHO reads change metadata through it, which a
 * facade answers, and any other member throws.
 */
export const getBackend: AutomergeModule['getBackend'] = (doc) => {
  const tag = tagOf(doc);
  if (!tag) {
    return requireRegistered('getBackend').getBackend(doc);
  }
  const facade = {
    getHeads: () => [...tag.heads],
    getChangeMetaByHash: (hash: string) => metadataOf(tag.tab, hash) ?? null,
  };
  const backend = new Proxy(facade, {
    get: (target, property) =>
      Reflect.has(target, property)
        ? Reflect.get(target, property)
        : () => {
            throw new TabDocumentUnsupportedError(`getBackend().${String(property)}`);
          },
  });
  // The facade stands in for the WebAssembly handle for the members above.
  return backend as ReturnType<AutomergeModule['getBackend']>;
};

//
// Changes and bytes: every change a tab holds encodes to the bytes of its hash.
//

export const save: AutomergeModule['save'] = (doc) => {
  const tag = tagOf(doc);
  // Change chunks back to back, which `A.load` and `repo.import` take as they take a saved document.
  return tag ? concat(bytesOf(tag.tab.changesIn(tag.heads))) : requireRegistered('save').save(doc);
};

export const saveSince: AutomergeModule['saveSince'] = (doc, heads) => {
  const tag = tagOf(doc);
  return tag ? concat(bytesOf(changesSince(tag, heads))) : requireRegistered('saveSince').saveSince(doc, heads);
};

export const getAllChanges: AutomergeModule['getAllChanges'] = (doc) => {
  const tag = tagOf(doc);
  return tag ? bytesOf(tag.tab.changesIn(tag.heads)) : requireRegistered('getAllChanges').getAllChanges(doc);
};

export const getChangesSince: AutomergeModule['getChangesSince'] = (doc, heads) => {
  const tag = tagOf(doc);
  return tag ? bytesOf(changesSince(tag, heads)) : requireRegistered('getChangesSince').getChangesSince(doc, heads);
};

export const getChanges: AutomergeModule['getChanges'] = (before, after) => {
  const tag = tagOf(after);
  if (!tag) {
    return requireRegistered('getChanges').getChanges(before, after);
  }
  const beforeTag = tagOf(before);
  const have = new Set(
    beforeTag
      ? beforeTag.tab.model.changesIn(beforeTag.heads)
      : requireRegistered('getChanges')
          .getAllChanges(before)
          .map((bytes) => decode(bytes).hash),
  );
  return bytesOf(tag.tab.changesIn(tag.heads).filter((change) => !have.has(change.hash)));
};

export const getLastLocalChange: AutomergeModule['getLastLocalChange'] = (doc) => {
  const tag = tagOf(doc);
  if (!tag) {
    return requireRegistered('getLastLocalChange').getLastLocalChange(doc);
  }
  const change = tag.tab.lastLocalChange();
  return change ? encodeTabChange(change).bytes : undefined;
};

//
// Writes.
//

export const change: AutomergeModule['change'] = (doc, options, callback) => {
  const tag = tabOf(doc);
  if (!tag) {
    return requireRegistered('change').change(doc, options, callback);
  }
  const tab = current(tag);
  const [fn, changeOptions] = changeArguments(options, callback);
  tab.change(fn, changeOptions);
  return tab.doc();
};

export const changeAt: AutomergeModule['changeAt'] = (doc, scope, options, callback) => {
  const tag = tabOf(doc);
  if (!tag) {
    return requireRegistered('changeAt').changeAt(doc, scope, options, callback);
  }
  const tab = current(tag);
  const [fn, changeOptions] = changeArguments(options, callback);
  const newHeads = tab.changeAt(scope, fn, changeOptions) ?? null;
  return { newDoc: tab.doc(), newHeads };
};

export const emptyChange: AutomergeModule['emptyChange'] = (doc, options) => {
  unsupported('emptyChange', [doc]);
  return requireRegistered('emptyChange').emptyChange(doc, options);
};

export const applyChanges: AutomergeModule['applyChanges'] = (doc, changes, options) => {
  const tag = tabOf(doc);
  if (!tag) {
    return requireRegistered('applyChanges').applyChanges(doc, changes, options);
  }
  const tab = current(tag);
  tab.applyChanges(changes.map(decode));
  return [tab.doc()];
};

export const loadIncremental: AutomergeModule['loadIncremental'] = (doc, data, options) => {
  const tag = tabOf(doc);
  if (!tag) {
    return requireRegistered('loadIncremental').loadIncremental(doc, data, options);
  }
  const tab = current(tag);
  tab.applyChanges(decodeAll(data));
  return tab.doc();
};

export const merge: AutomergeModule['merge'] = (local, remote) => {
  const tag = tabOf(local);
  const remoteTag = tagOf(remote);
  if (!tag) {
    const automerge = requireRegistered('merge');
    return remoteTag
      ? automerge.applyChanges(local, bytesOf(remoteTag.tab.changesIn(remoteTag.heads)))[0]
      : automerge.merge(local, remote);
  }
  const tab = current(tag);
  tab.applyChanges(
    remoteTag ? remoteTag.tab.changesIn(remoteTag.heads) : requireRegistered('merge').getAllChanges(remote).map(decode),
  );
  return tab.doc();
};

export const clone: AutomergeModule['clone'] = <T>(doc: Doc<T>, options?: string | Automerge.InitOptions<T>) => {
  const tag = tabOf(doc);
  return tag
    ? TabDoc.fromChanges<T>(tag.tab.changesIn(tag.heads), { actor: actorOf(options) }).doc()
    : requireRegistered('clone').clone(doc, options);
};

export const free: AutomergeModule['free'] = (doc) => {
  if (!tagOf(doc)) {
    requireRegistered('free').free(doc);
  }
};

export const splice: AutomergeModule['splice'] = (doc, path, index, del, newText) => {
  if (typeof index === 'number' && Draft.splice(doc, path, index, del, newText ?? '')) {
    return;
  }
  if (Draft.getInfo(doc) || tagOf(doc)) {
    throw new TypeError('A tab document is spliced at a numeric position inside a change callback');
  }
  requireRegistered('splice').splice(doc, path, index, del, newText);
};

export const updateText: AutomergeModule['updateText'] = (doc, path, newText) => {
  if (Draft.updateText(doc, path, newText)) {
    return;
  }
  if (tagOf(doc)) {
    throw new TypeError('A tab document is edited inside a change callback');
  }
  requireRegistered('updateText').updateText(doc, path, newText);
};

export const insertAt: AutomergeModule['insertAt'] = (list, index, ...values) => {
  if (Draft.getInfo(list)) {
    list.splice(index, 0, ...values);
    return;
  }
  requireRegistered('insertAt').insertAt(list, index, ...values);
};

export const deleteAt: AutomergeModule['deleteAt'] = (list, index, numDelete) => {
  if (Draft.getInfo(list)) {
    list.splice(index, numDelete ?? 1);
    return;
  }
  requireRegistered('deleteAt').deleteAt(list, index, numDelete);
};

//
// What only Automerge answers: sync, rich text, fragments, authors and the WebAssembly setup.
//

export const initSyncState: AutomergeModule['initSyncState'] = (options) =>
  requireRegistered('initSyncState').initSyncState(options);

export const generateSyncMessage: AutomergeModule['generateSyncMessage'] = (doc, state) => {
  unsupported('generateSyncMessage', [doc]);
  return requireRegistered('generateSyncMessage').generateSyncMessage(doc, state);
};

export const receiveSyncMessage: AutomergeModule['receiveSyncMessage'] = (doc, state, message, options) => {
  unsupported('receiveSyncMessage', [doc]);
  return requireRegistered('receiveSyncMessage').receiveSyncMessage(doc, state, message, options);
};

export const hasOurChanges: AutomergeModule['hasOurChanges'] = (doc, state) => {
  unsupported('hasOurChanges', [doc]);
  return requireRegistered('hasOurChanges').hasOurChanges(doc, state);
};

export const encodeSyncState: AutomergeModule['encodeSyncState'] = (state) =>
  requireRegistered('encodeSyncState').encodeSyncState(state);

export const decodeSyncState: AutomergeModule['decodeSyncState'] = (state) =>
  requireRegistered('decodeSyncState').decodeSyncState(state);

export const encodeSyncMessage: AutomergeModule['encodeSyncMessage'] = (message) =>
  requireRegistered('encodeSyncMessage').encodeSyncMessage(message);

export const decodeSyncMessage: AutomergeModule['decodeSyncMessage'] = (message) =>
  requireRegistered('decodeSyncMessage').decodeSyncMessage(message);

export const mark: AutomergeModule['mark'] = (doc, path, range, name, value) => {
  unsupported('mark', [doc]);
  requireRegistered('mark').mark(doc, path, range, name, value);
};

export const unmark: AutomergeModule['unmark'] = (doc, path, range, name) => {
  unsupported('unmark', [doc]);
  requireRegistered('unmark').unmark(doc, path, range, name);
};

export const marks: AutomergeModule['marks'] = (doc, path) => {
  unsupported('marks', [doc]);
  return requireRegistered('marks').marks(doc, path);
};

export const marksAt: AutomergeModule['marksAt'] = (doc, path, index) => {
  unsupported('marksAt', [doc]);
  return requireRegistered('marksAt').marksAt(doc, path, index);
};

export const spans: AutomergeModule['spans'] = (doc, path) => {
  unsupported('spans', [doc]);
  return requireRegistered('spans').spans(doc, path);
};

export const block: AutomergeModule['block'] = (doc, path, index) => {
  unsupported('block', [doc]);
  return requireRegistered('block').block(doc, path, index);
};

export const splitBlock: AutomergeModule['splitBlock'] = (doc, path, index, value) => {
  unsupported('splitBlock', [doc]);
  requireRegistered('splitBlock').splitBlock(doc, path, index, value);
};

export const joinBlock: AutomergeModule['joinBlock'] = (doc, path, index) => {
  unsupported('joinBlock', [doc]);
  requireRegistered('joinBlock').joinBlock(doc, path, index);
};

export const updateBlock: AutomergeModule['updateBlock'] = (doc, path, index, value) => {
  unsupported('updateBlock', [doc]);
  requireRegistered('updateBlock').updateBlock(doc, path, index, value);
};

export const updateSpans: AutomergeModule['updateSpans'] = (doc, path, newSpans, config) => {
  unsupported('updateSpans', [doc]);
  requireRegistered('updateSpans').updateSpans(doc, path, newSpans, config);
};

export const applyPatch: AutomergeModule['applyPatch'] = (doc, patch) => {
  unsupported('applyPatch', [doc]);
  requireRegistered('applyPatch').applyPatch(doc, patch);
};

export const applyPatches: AutomergeModule['applyPatches'] = (doc, patches) => {
  unsupported('applyPatches', [doc]);
  requireRegistered('applyPatches').applyPatches(doc, patches);
};

export const diffPath: AutomergeModule['diffPath'] = (doc, path, before, after, options) => {
  unsupported('diffPath', [doc]);
  return requireRegistered('diffPath').diffPath(doc, path, before, after, options);
};

export const anonymize: AutomergeModule['anonymize'] = (doc) => {
  unsupported('anonymize', [doc]);
  return requireRegistered('anonymize').anonymize(doc);
};

export const getAuthor: AutomergeModule['getAuthor'] = (doc) => {
  unsupported('getAuthor', [doc]);
  return requireRegistered('getAuthor').getAuthor(doc);
};

export const getAuthors: AutomergeModule['getAuthors'] = (doc) => {
  unsupported('getAuthors', [doc]);
  return requireRegistered('getAuthors').getAuthors(doc);
};

export const getActorsForAuthor: AutomergeModule['getActorsForAuthor'] = (doc, author) => {
  unsupported('getActorsForAuthor', [doc]);
  return requireRegistered('getActorsForAuthor').getActorsForAuthor(doc, author);
};

export const getAuthorForActor: AutomergeModule['getAuthorForActor'] = (doc, actor) => {
  unsupported('getAuthorForActor', [doc]);
  return requireRegistered('getAuthorForActor').getAuthorForActor(doc, actor);
};

export const addCommits: AutomergeModule['addCommits'] = (doc, commits, options) => {
  unsupported('addCommits', [doc]);
  return requireRegistered('addCommits').addCommits(doc, commits, options);
};

export const getCommits: AutomergeModule['getCommits'] = (doc) => {
  unsupported('getCommits', [doc]);
  return requireRegistered('getCommits').getCommits(doc);
};

export const addFragments: AutomergeModule['addFragments'] = (doc, fragments, options) => {
  unsupported('addFragments', [doc]);
  return requireRegistered('addFragments').addFragments(doc, fragments, options);
};

export const getFragments: AutomergeModule['getFragments'] = (doc, levels) => {
  unsupported('getFragments', [doc]);
  return requireRegistered('getFragments').getFragments(doc, levels);
};

export const getFragmentMeta: AutomergeModule['getFragmentMeta'] = (doc, head) => {
  unsupported('getFragmentMeta', [doc]);
  return requireRegistered('getFragmentMeta').getFragmentMeta(doc, head);
};

export const getFragmentMetadata: AutomergeModule['getFragmentMetadata'] = (doc, levels) => {
  unsupported('getFragmentMetadata', [doc]);
  return requireRegistered('getFragmentMetadata').getFragmentMetadata(doc, levels);
};

export const bundleFragmentMetadata: AutomergeModule['bundleFragmentMetadata'] = (doc, fragments) => {
  unsupported('bundleFragmentMetadata', [doc]);
  return requireRegistered('bundleFragmentMetadata').bundleFragmentMetadata(doc, fragments);
};

export const readBundle: AutomergeModule['readBundle'] = (bundle) => requireRegistered('readBundle').readBundle(bundle);

export const saveBundle: AutomergeModule['saveBundle'] = (doc, hashes) => {
  unsupported('saveBundle', [doc]);
  return requireRegistered('saveBundle').saveBundle(doc, hashes);
};

export const saveIncremental: AutomergeModule['saveIncremental'] = (doc) => {
  unsupported('saveIncremental', [doc]);
  return requireRegistered('saveIncremental').saveIncremental(doc);
};

export const stats: AutomergeModule['stats'] = (doc) => {
  unsupported('stats', [doc]);
  return requireRegistered('stats').stats(doc);
};

export const dump: AutomergeModule['dump'] = (doc) => {
  unsupported('dump', [doc]);
  requireRegistered('dump').dump(doc);
};

export const releaseInfo: AutomergeModule['releaseInfo'] = () => requireRegistered('releaseInfo').releaseInfo();

export const use: AutomergeModule['use'] = (api) => requireRegistered('use').use(api);

export const initializeWasm: AutomergeModule['initializeWasm'] = (wasmBlob) =>
  requireRegistered('initializeWasm').initializeWasm(wasmBlob);

export const initializeBase64Wasm: AutomergeModule['initializeBase64Wasm'] = (wasmBase64) =>
  requireRegistered('initializeBase64Wasm').initializeBase64Wasm(wasmBase64);

export const wasmInitialized: AutomergeModule['wasmInitialized'] = () =>
  requireRegistered('wasmInitialized').wasmInitialized();

export const isWasmInitialized: AutomergeModule['isWasmInitialized'] = () =>
  getRegistered()?.isWasmInitialized() ?? false;
