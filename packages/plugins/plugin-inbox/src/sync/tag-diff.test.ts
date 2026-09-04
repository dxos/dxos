//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type TagsByMessage, diffTags } from './tag-diff';

const STARRED = 'echo://tag/starred';
const INBOX = 'echo://tag/inbox';
const LABEL = 'echo://tag/gmail-label';
const USER = 'echo://tag/user';

/** The provider's label map inverted: canonical tags it maps, plus its own label tags. */
const ELIGIBLE = new Set([STARRED, INBOX, LABEL]);

const tags = (entries: Record<string, string[]>): TagsByMessage =>
  new Map(Object.entries(entries).map(([id, uris]) => [id, new Set(uris)]));

/** Flattens a diff side to plain arrays so assertions read as data rather than Map/Set ceremony. */
const plain = (side: ReadonlyMap<string, { add: readonly string[]; remove: readonly string[] }>) =>
  Object.fromEntries([...side].map(([id, change]) => [id, { add: [...change.add], remove: [...change.remove] }]));

describe('diffTags', () => {
  test('all three sides agree — nothing to do', ({ expect }) => {
    const state = tags({ m1: [STARRED] });
    const diff = diffTags({ base: state, local: state, remote: state, eligible: ELIGIBLE });
    expect(plain(diff.push)).toEqual({});
    expect(plain(diff.pull)).toEqual({});
  });

  test('local-only add pushes', ({ expect }) => {
    const diff = diffTags({
      base: tags({ m1: [] }),
      local: tags({ m1: [STARRED] }),
      remote: tags({ m1: [] }),
      eligible: ELIGIBLE,
    });
    expect(plain(diff.push)).toEqual({ m1: { add: [STARRED], remove: [] } });
    expect(plain(diff.pull)).toEqual({});
  });

  test('local-only remove pushes — archive is the inbox tag coming off', ({ expect }) => {
    const diff = diffTags({
      base: tags({ m1: [INBOX] }),
      local: tags({ m1: [] }),
      remote: tags({ m1: [INBOX] }),
      eligible: ELIGIBLE,
    });
    expect(plain(diff.push)).toEqual({ m1: { add: [], remove: [INBOX] } });
    expect(plain(diff.pull)).toEqual({});
  });

  test('remote-only add pulls', ({ expect }) => {
    const diff = diffTags({
      base: tags({ m1: [] }),
      local: tags({ m1: [] }),
      remote: tags({ m1: [LABEL] }),
      eligible: ELIGIBLE,
    });
    expect(plain(diff.pull)).toEqual({ m1: { add: [LABEL], remove: [] } });
    expect(plain(diff.push)).toEqual({});
  });

  test('remote-only remove pulls', ({ expect }) => {
    const diff = diffTags({
      base: tags({ m1: [LABEL] }),
      local: tags({ m1: [LABEL] }),
      remote: tags({ m1: [] }),
      eligible: ELIGIBLE,
    });
    expect(plain(diff.pull)).toEqual({ m1: { add: [], remove: [LABEL] } });
    expect(plain(diff.push)).toEqual({});
  });

  test('both sides added the same tag — converged, no traffic', ({ expect }) => {
    const diff = diffTags({
      base: tags({ m1: [] }),
      local: tags({ m1: [STARRED] }),
      remote: tags({ m1: [STARRED] }),
      eligible: ELIGIBLE,
    });
    expect(plain(diff.push)).toEqual({});
    expect(plain(diff.pull)).toEqual({});
  });

  test('both sides removed the same tag — converged', ({ expect }) => {
    const diff = diffTags({
      base: tags({ m1: [STARRED] }),
      local: tags({ m1: [] }),
      remote: tags({ m1: [] }),
      eligible: ELIGIBLE,
    });
    expect(plain(diff.push)).toEqual({});
    expect(plain(diff.pull)).toEqual({});
  });

  /**
   * Membership is a boolean on each side, so `local !== base && remote !== base` forces
   * `local === remote` — both flipped to the negation of base. There is no opposed-edit case to
   * resolve, and therefore no conflict policy to apply. This test is the guard: it fails the moment
   * a third state (a tombstone, a tri-state, a per-tag payload) makes a conflict representable, which
   * is exactly when a policy would need deciding.
   */
  test('an opposed conflict is unrepresentable — every (base, local, remote) triple resolves', ({ expect }) => {
    const outcomes = new Set<string>();
    for (const base of [false, true]) {
      for (const local of [false, true]) {
        for (const remote of [false, true]) {
          const diff = diffTags({
            base: tags({ m1: base ? [STARRED] : [] }),
            local: tags({ m1: local ? [STARRED] : [] }),
            remote: tags({ m1: remote ? [STARRED] : [] }),
            eligible: ELIGIBLE,
          });
          const pushed = diff.push.get('m1');
          const pulled = diff.pull.get('m1');
          // Never both directions for one tag — that is what an unresolved conflict would look like.
          expect(pushed !== undefined && pulled !== undefined).toBe(false);
          outcomes.add(pushed ? 'push' : pulled ? 'pull' : 'none');
        }
      }
    }
    expect([...outcomes].sort()).toEqual(['none', 'pull', 'push']);
  });

  test('ineligible tags are ignored entirely', ({ expect }) => {
    const diff = diffTags({
      base: tags({ m1: [] }),
      local: tags({ m1: [USER] }),
      remote: tags({ m1: [] }),
      eligible: ELIGIBLE,
    });
    expect(plain(diff.push)).toEqual({});
    expect(plain(diff.pull)).toEqual({});
  });

  test('a message absent from a side counts as untagged, not skipped', ({ expect }) => {
    const diff = diffTags({
      base: new Map(),
      local: tags({ m1: [STARRED] }),
      remote: new Map(),
      eligible: ELIGIBLE,
    });
    expect(plain(diff.push)).toEqual({ m1: { add: [STARRED], remove: [] } });
  });

  test('several messages and tags resolve independently', ({ expect }) => {
    const diff = diffTags({
      base: tags({ m1: [INBOX], m2: [LABEL] }),
      local: tags({ m1: [INBOX, STARRED], m2: [LABEL] }),
      remote: tags({ m1: [INBOX], m2: [] }),
      eligible: ELIGIBLE,
    });
    expect(plain(diff.push)).toEqual({ m1: { add: [STARRED], remove: [] } });
    expect(plain(diff.pull)).toEqual({ m2: { add: [], remove: [LABEL] } });
  });
});

describe('diffTags — first sync', () => {
  test('pushes nothing and pulls everything the remote has', ({ expect }) => {
    const diff = diffTags({
      base: undefined,
      local: tags({ m1: [STARRED] }),
      remote: tags({ m1: [LABEL] }),
      eligible: ELIGIBLE,
      firstSync: true,
    });
    // No base means no evidence these local tags were ever meant for the provider.
    expect(plain(diff.push)).toEqual({});
    expect(plain(diff.pull)).toEqual({ m1: { add: [LABEL], remove: [] } });
  });
});

describe('diffTags — base-less additive reconcile', () => {
  test('pushes what the remote lacks and pulls what the local lacks', ({ expect }) => {
    const diff = diffTags({
      base: undefined,
      local: tags({ m1: [STARRED] }),
      remote: tags({ m1: [LABEL] }),
      eligible: ELIGIBLE,
    });
    expect(plain(diff.push)).toEqual({ m1: { add: [STARRED], remove: [] } });
    expect(plain(diff.pull)).toEqual({ m1: { add: [LABEL], remove: [] } });
  });

  test('emits no removal in either direction', ({ expect }) => {
    const diff = diffTags({
      base: undefined,
      local: tags({ m1: [STARRED] }),
      remote: tags({ m1: [INBOX] }),
      eligible: ELIGIBLE,
    });
    // Without a base, "local has it and remote does not" cannot distinguish a local add from a
    // remote removal, so only the additive half is sound.
    expect([...diff.push.values()].every((change) => change.remove.length === 0)).toBe(true);
    expect([...diff.pull.values()].every((change) => change.remove.length === 0)).toBe(true);
  });

  test('agreeing sides produce nothing', ({ expect }) => {
    const state = tags({ m1: [STARRED, LABEL] });
    const diff = diffTags({ base: undefined, local: state, remote: state, eligible: ELIGIBLE });
    expect(plain(diff.push)).toEqual({});
    expect(plain(diff.pull)).toEqual({});
  });
});
