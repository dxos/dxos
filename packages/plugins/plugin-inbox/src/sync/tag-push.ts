//
// Copyright 2026 DXOS.org
//

import { type TagsByMessage } from './tag-diff.ts';

/**
 * The pure half of the tag-push phase: turning a run's observed state into the three sides
 * {@link diffTags} needs, and its output into provider-vocabulary ops.
 *
 * Kept out of `mail-sync.ts` so each step is testable without a database, a provider, or a pipeline —
 * see `tag-push.test.ts`. The effectful orchestration (heads capture, index reads, `pushTags`) stays
 * in the harness. See `docs/TAG-SYNC.md`.
 */

/** The shape both a live `TagIndex` and an `Obj.Snapshot` of one expose: tag uri → object ids. */
export type TagIndexRecord = Readonly<Record<string, readonly string[]>>;

/**
 * Inverts a tag index into `messageId → tag uris`, keeping only eligible tags.
 *
 * The index is stored tag-major (sparse: tags are rare relative to messages) while reconciliation is
 * message-major, and restricting to `eligible` here rather than in the diff keeps every downstream map
 * small — a mailbox may carry thousands of user-tag associations the provider will never see.
 */
export const tagsFromIndex = (index: TagIndexRecord, eligible: ReadonlySet<string>): TagsByMessage => {
  const byMessage = new Map<string, Set<string>>();
  for (const [uri, ids] of Object.entries(index)) {
    if (!eligible.has(uri)) {
      continue;
    }
    for (const id of ids) {
      const tags = byMessage.get(id);
      if (tags) {
        tags.add(uri);
      } else {
        byMessage.set(id, new Set([uri]));
      }
    }
  }
  return byMessage;
};

/** What a run observed the provider say, accumulated as its changes streamed past. */
export type ObservedRemote = {
  /** Per already-committed message, the tag adds/removes the provider's delta reported. */
  readonly retags: ReadonlyMap<string, { readonly add: readonly string[]; readonly remove: readonly string[] }>;
  /** Per message inserted this run, the provider's own labels at fetch time (`remoteTagUris`). */
  readonly inserts: ReadonlyMap<string, readonly string[]>;
};

/**
 * The structural subset of `EmailStage.Change` the observer reads. Declared here rather than importing
 * the union so this module stays free of the pipeline package, and so tests can feed it plain objects
 * instead of constructing whole `Message`s.
 */
export type ObservableChange =
  | {
      readonly _tag: 'retag';
      readonly foreignId: string;
      readonly entityId: string;
      readonly addTagIds: readonly string[];
      readonly removeTagIds: readonly string[];
    }
  | {
      readonly _tag: 'insert';
      readonly foreignId: string;
      readonly message: { readonly id: string };
      readonly tagUris?: readonly string[];
      readonly remoteTagUris?: readonly string[];
    }
  | { readonly _tag: 'delete' };

/** Accumulator the harness feeds from the change stream; see {@link createRemoteObserver}. */
export type RemoteObserver = ObservedRemote & {
  /** Message id → provider foreign id for everything this run touched, so most pushes need no query. */
  readonly foreignIds: ReadonlyMap<string, string>;
  readonly observe: (change: ObservableChange) => void;
};

/**
 * Collects the provider's reported state as changes pass through the pipeline.
 *
 * The harness cannot ask the provider for remote tag state after the fact — the delta is consumed by
 * the stream — so it is recorded in flight. Inserts record only `remoteTagUris`, deliberately not the
 * full `tagUris`: the difference between them is precisely the insert-time local tagging that must
 * push (see `Insert.remoteTagUris`).
 */
export const createRemoteObserver = (): RemoteObserver => {
  const retags = new Map<string, { add: readonly string[]; remove: readonly string[] }>();
  const inserts = new Map<string, readonly string[]>();
  const foreignIds = new Map<string, string>();
  return {
    retags,
    inserts,
    foreignIds,
    observe: (change) => {
      switch (change._tag) {
        case 'retag':
          retags.set(change.entityId, { add: change.addTagIds, remove: change.removeTagIds });
          foreignIds.set(change.entityId, change.foreignId);
          break;
        case 'insert':
          // `message.id` is the object's id before the feed append, which is what the tag index keys by.
          inserts.set(change.message.id, change.remoteTagUris ?? change.tagUris ?? []);
          foreignIds.set(change.message.id, change.foreignId);
          break;
        default:
          break;
      }
    },
  };
};

/**
 * The provider's current tag state, as `base ⊕ (this run's delta)`.
 *
 * A message the delta never mentioned is unchanged at the provider, so it keeps its base entry — which
 * is what makes an untouched message produce no traffic in either direction.
 *
 * **Inserted messages are why no base overlay is needed.** A message committed this run has no entry
 * in the persisted base, so a provider label on it looks like a local-only addition — except that this
 * function also records the message's `remoteTagUris`, making the tag present on *both* the local and
 * remote sides with an empty base. The merge reads that as converged (both changed to the same value)
 * and emits nothing, while an insert-time local tag — absent from `remoteTagUris` — is local-only and
 * pushes. Modelling the remote side accurately is sufficient; seeding the base separately would be a
 * second mechanism for the same outcome.
 */
export const remoteFromBase = (
  base: TagsByMessage | undefined,
  observed: ObservedRemote,
  eligible: ReadonlySet<string>,
): TagsByMessage => {
  const remote = new Map<string, Set<string>>();
  for (const [id, tags] of base ?? []) {
    remote.set(id, new Set(tags));
  }
  for (const [id, { add, remove }] of observed.retags) {
    const tags = remote.get(id) ?? new Set<string>();
    for (const uri of add) {
      if (eligible.has(uri)) {
        tags.add(uri);
      }
    }
    for (const uri of remove) {
      tags.delete(uri);
    }
    remote.set(id, tags);
  }
  for (const [id, uris] of observed.inserts) {
    remote.set(id, new Set(uris.filter((uri) => eligible.has(uri))));
  }
  return remote;
};

/** One message's tag movements to apply at the provider, in provider vocabulary. */
export type TagPushOp = {
  readonly foreignId: string;
  readonly addLabelIds: readonly string[];
  readonly removeLabelIds: readonly string[];
};

/**
 * Resolves the diff's push half into provider ops: message id → foreign id, tag uri → label id.
 *
 * Drops any message whose foreign id is unknown (never synced, or outside this run's resolution) and
 * any tag with no provider binding — both are unpushable rather than erroneous, and a run that
 * silently pushed a partial op would record a settled state it had not achieved.
 */
export const resolvePushOps = ({
  push,
  foreignIds,
  bindings,
}: {
  readonly push: ReadonlyMap<string, { readonly add: readonly string[]; readonly remove: readonly string[] }>;
  readonly foreignIds: ReadonlyMap<string, string>;
  readonly bindings: ReadonlyMap<string, string>;
}): TagPushOp[] => {
  const ops: TagPushOp[] = [];
  for (const [messageId, change] of push) {
    const foreignId = foreignIds.get(messageId);
    if (!foreignId) {
      continue;
    }
    const toLabels = (uris: readonly string[]) =>
      uris.flatMap((uri) => {
        const labelId = bindings.get(uri);
        return labelId ? [labelId] : [];
      });
    const addLabelIds = toLabels(change.add);
    const removeLabelIds = toLabels(change.remove);
    if (addLabelIds.length > 0 || removeLabelIds.length > 0) {
      ops.push({ foreignId, addLabelIds, removeLabelIds });
    }
  }
  return ops;
};

/**
 * Groups ops by identical add/remove label sets so a provider can batch them (Gmail `batchModify`
 * carries up to 1000 message ids per call). Order within a group is the ops' order; groups are keyed
 * by the sorted label sets so two ops differing only in order still batch together.
 */
export const batchPushOps = (
  ops: readonly TagPushOp[],
): {
  readonly addLabelIds: readonly string[];
  readonly removeLabelIds: readonly string[];
  readonly foreignIds: string[];
}[] => {
  const groups = new Map<
    string,
    { addLabelIds: readonly string[]; removeLabelIds: readonly string[]; foreignIds: string[] }
  >();
  for (const op of ops) {
    const add = [...op.addLabelIds].sort();
    const remove = [...op.removeLabelIds].sort();
    const key = JSON.stringify([add, remove]);
    const group = groups.get(key);
    if (group) {
      group.foreignIds.push(op.foreignId);
    } else {
      groups.set(key, { addLabelIds: add, removeLabelIds: remove, foreignIds: [op.foreignId] });
    }
  }
  return [...groups.values()];
};
