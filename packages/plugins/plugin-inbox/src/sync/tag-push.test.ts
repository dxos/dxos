//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { diffTags } from './tag-diff';
import {
  type ObservableChange,
  batchPushOps,
  createRemoteObserver,
  remoteFromBase,
  resolvePushOps,
  tagsFromIndex,
} from './tag-push';

/** Structural stand-ins for pipeline changes — the observer reads only these fields. */
const retag = (entityId: string, add: string[], remove: string[]): ObservableChange => ({
  _tag: 'retag',
  foreignId: `foreign-${entityId}`,
  entityId,
  addTagIds: add,
  removeTagIds: remove,
});
const insert = (id: string, tagUris: string[], remoteTagUris?: string[]): ObservableChange => ({
  _tag: 'insert',
  foreignId: `foreign-${id}`,
  message: { id },
  tagUris,
  ...(remoteTagUris ? { remoteTagUris } : {}),
});

const STARRED = 'echo://tag/starred';
const INBOX = 'echo://tag/inbox';
const IMPORTANT = 'echo://tag/important';
const USER = 'echo://tag/user';

const ELIGIBLE = new Set([STARRED, INBOX, IMPORTANT]);

const BINDINGS = new Map([
  [STARRED, 'STARRED'],
  [INBOX, 'INBOX'],
  [IMPORTANT, 'IMPORTANT'],
]);

const asObject = (tags: ReadonlyMap<string, ReadonlySet<string>>) =>
  Object.fromEntries([...tags].map(([id, uris]) => [id, [...uris].sort()]));

describe('tagsFromIndex', () => {
  test('inverts tag-major storage into message-major, dropping ineligible tags', ({ expect }) => {
    const tags = tagsFromIndex({ [STARRED]: ['m1', 'm2'], [INBOX]: ['m1'], [USER]: ['m1'] }, ELIGIBLE);
    expect(asObject(tags)).toEqual({ m1: [INBOX, STARRED], m2: [STARRED] });
  });

  test('an empty index yields no messages', ({ expect }) => {
    expect(asObject(tagsFromIndex({}, ELIGIBLE))).toEqual({});
  });
});

describe('createRemoteObserver', () => {
  test('records a retag by entity id and an insert by its provider labels only', ({ expect }) => {
    const observer = createRemoteObserver();
    observer.observe(retag('m1', [STARRED], [INBOX]));
    observer.observe(insert('m2', [INBOX, IMPORTANT], [INBOX]));

    expect(observer.retags.get('m1')).toEqual({ add: [STARRED], remove: [INBOX] });
    expect(observer.inserts.get('m2')).toEqual([INBOX]);
    // Foreign ids are captured in flight so most pushes resolve without a feed query.
    expect(observer.foreignIds.get('m1')).toBe('foreign-m1');
    expect(observer.foreignIds.get('m2')).toBe('foreign-m2');
  });

  test('an insert without remoteTagUris treats every tag as provider-derived', ({ expect }) => {
    const observer = createRemoteObserver();
    observer.observe(insert('m1', [INBOX]));
    expect(observer.inserts.get('m1')).toEqual([INBOX]);
  });
});

describe('remoteFromBase', () => {
  test('a message the delta never mentioned keeps its base tags', ({ expect }) => {
    const base = new Map([['m1', new Set([INBOX])]]);
    const remote = remoteFromBase(base, createRemoteObserver(), ELIGIBLE);
    expect(asObject(remote)).toEqual({ m1: [INBOX] });
  });

  test('applies the delta adds and removes over the base', ({ expect }) => {
    const observer = createRemoteObserver();
    observer.observe(retag('m1', [STARRED], [INBOX]));
    const base = new Map([['m1', new Set([INBOX])]]);
    expect(asObject(remoteFromBase(base, observer, ELIGIBLE))).toEqual({ m1: [STARRED] });
  });

  test('an inserted message takes the provider labels wholesale', ({ expect }) => {
    const observer = createRemoteObserver();
    observer.observe(insert('m1', [INBOX, IMPORTANT], [INBOX]));
    expect(asObject(remoteFromBase(undefined, observer, ELIGIBLE))).toEqual({ m1: [INBOX] });
  });
});

describe('insert-time tagging', () => {
  /**
   * A message arrives carrying Gmail's INBOX label; the known-sender rule adds the canonical
   * `important` tag locally during the same run. Both land before the run captures its heads, so the
   * only thing that separates them is that `remoteTagUris` names the first and not the second.
   */
  test('provider labels do not push, insert-time local tags do', ({ expect }) => {
    const observer = createRemoteObserver();
    observer.observe(insert('m1', [INBOX, IMPORTANT], [INBOX]));

    // Post-commit local state: both tags are on the message. The persisted base knows nothing of a
    // message committed this run, so it is empty for it.
    const local = tagsFromIndex({ [INBOX]: ['m1'], [IMPORTANT]: ['m1'] }, ELIGIBLE);
    const base = new Map();
    const remote = remoteFromBase(base, observer, ELIGIBLE);

    const diff = diffTags({ base, local, remote, eligible: ELIGIBLE });
    // INBOX is on local and remote with an empty base — converged, no traffic. IMPORTANT is
    // local-only, so it pushes.
    expect([...(diff.push.get('m1')?.add ?? [])]).toEqual([IMPORTANT]);
    expect(diff.push.get('m1')?.remove ?? []).toEqual([]);
    expect(diff.pull.size).toBe(0);
  });

  /**
   * The regression guard for {@link remoteFromBase} recording inserts. Drop that and a newly-synced
   * message's own labels read as local additions, pushing them straight back at the provider they
   * came from on every first sight of a message.
   */
  test('a remote side that ignores inserts would push the provider its own labels back', ({ expect }) => {
    const local = tagsFromIndex({ [INBOX]: ['m1'], [IMPORTANT]: ['m1'] }, ELIGIBLE);
    const diff = diffTags({ base: new Map(), local, remote: new Map(), eligible: ELIGIBLE });
    expect([...(diff.push.get('m1')?.add ?? [])].sort()).toEqual([IMPORTANT, INBOX].sort());
  });
});

describe('resolvePushOps', () => {
  test('maps message ids to foreign ids and tag uris to label ids', ({ expect }) => {
    const ops = resolvePushOps({
      push: new Map([['m1', { add: [STARRED], remove: [INBOX] }]]),
      foreignIds: new Map([['m1', 'gmail-1']]),
      bindings: BINDINGS,
    });
    expect(ops).toEqual([{ foreignId: 'gmail-1', addLabelIds: ['STARRED'], removeLabelIds: ['INBOX'] }]);
  });

  test('drops a message whose foreign id is unknown', ({ expect }) => {
    const ops = resolvePushOps({
      push: new Map([['m1', { add: [STARRED], remove: [] }]]),
      foreignIds: new Map(),
      bindings: BINDINGS,
    });
    expect(ops).toEqual([]);
  });

  test('drops a tag with no provider binding, and the op entirely when nothing is left', ({ expect }) => {
    const ops = resolvePushOps({
      push: new Map([['m1', { add: [USER], remove: [] }]]),
      foreignIds: new Map([['m1', 'gmail-1']]),
      bindings: BINDINGS,
    });
    expect(ops).toEqual([]);
  });
});

describe('batchPushOps', () => {
  test('groups messages sharing the same label movements', ({ expect }) => {
    const batches = batchPushOps([
      { foreignId: 'a', addLabelIds: ['STARRED'], removeLabelIds: [] },
      { foreignId: 'b', addLabelIds: ['STARRED'], removeLabelIds: [] },
      { foreignId: 'c', addLabelIds: [], removeLabelIds: ['INBOX'] },
    ]);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toEqual({ addLabelIds: ['STARRED'], removeLabelIds: [], foreignIds: ['a', 'b'] });
    expect(batches[1]).toEqual({ addLabelIds: [], removeLabelIds: ['INBOX'], foreignIds: ['c'] });
  });

  test('label order does not split a group', ({ expect }) => {
    const batches = batchPushOps([
      { foreignId: 'a', addLabelIds: ['STARRED', 'INBOX'], removeLabelIds: [] },
      { foreignId: 'b', addLabelIds: ['INBOX', 'STARRED'], removeLabelIds: [] },
    ]);
    expect(batches).toHaveLength(1);
    expect(batches[0].foreignIds).toEqual(['a', 'b']);
  });
});
