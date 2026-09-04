//
// Copyright 2026 DXOS.org
//

/**
 * The reconciliation core of bidirectional tag sync: given what the tag index looked like at the last
 * sync (`base`), what it looks like now (`local`), and what the provider says (`remote`), decide what
 * to push and what to pull.
 *
 * Deliberately pure — no ECHO, no provider, no Effect — so it is exhaustively testable without a
 * database, reusable by any container that owns a `TagIndex` (a Calendar's starred events, not just a
 * Mailbox), and indifferent to where `base` came from. That last property is what keeps the
 * Automerge-heads base swappable for a shadow index without touching this file. See
 * `docs/TAG-SYNC.md`.
 */

/** Tag uris carried by each message, keyed by message id. A message absent here carries no tags. */
export type TagsByMessage = ReadonlyMap<string, ReadonlySet<string>>;

/** One message's tag movements, in the direction the containing map names. */
export type TagChange = {
  readonly add: readonly string[];
  readonly remove: readonly string[];
};

export type TagDiff = {
  /** Local changes the provider has not seen — apply at the provider. */
  readonly push: ReadonlyMap<string, TagChange>;
  /** Provider changes the tag index has not seen — apply locally. */
  readonly pull: ReadonlyMap<string, TagChange>;
};

export type DiffTagsOptions = {
  /**
   * The tag index as of the last completed sync, or `undefined` when it is unavailable — either a
   * first sync (see {@link firstSync}) or heads that no longer resolve. Without it the diff degrades
   * to the additive reconcile described below.
   */
  readonly base: TagsByMessage | undefined;
  readonly local: TagsByMessage;
  readonly remote: TagsByMessage;
  /**
   * Tag uris the active provider knows — its label map inverted. Anything outside this set is
   * invisible to the diff, which is what keeps user tags from being pushed as new provider labels.
   */
  readonly eligible: ReadonlySet<string>;
  /**
   * Set on the very first sync of a binding, where a missing base means "never synced" rather than
   * "base lost". Suppresses the push half entirely: there is no evidence the local tags were ever
   * meant for the provider, and pushing them would blast a pre-existing local tag state at an account
   * that has never seen it.
   */
  readonly firstSync?: boolean;
};

const EMPTY: ReadonlySet<string> = new Set();

/** Accumulates into the change map, creating the entry lazily so untouched messages stay absent. */
const record = (
  into: Map<string, { add: string[]; remove: string[] }>,
  id: string,
  key: 'add' | 'remove',
  uri: string,
) => {
  let change = into.get(id);
  if (!change) {
    change = { add: [], remove: [] };
    into.set(id, change);
  }
  change[key].push(uri);
};

/**
 * Three-way merge of tag membership.
 *
 * **There is no conflict case.** Membership of one tag on one message is a boolean on each side, so
 * `local !== base && remote !== base` forces `local === remote` — both sides flipped to the negation
 * of base, which is convergence, not disagreement. All eight triples resolve to push, pull, or
 * nothing, and `tag-diff.test.ts` enumerates them to keep that true. A conflict policy would only
 * become necessary if membership stopped being a boolean (a tombstone, a tri-state, a per-tag
 * payload), which is why none is encoded here.
 *
 * Without a base the merge is **additive only**: push what the remote lacks, pull what the local
 * lacks, and remove nothing in either direction, because "local has it and remote does not" cannot be
 * told apart from "the remote removed it". Nothing is lost and nothing destructive is emitted; the
 * next run has a fresh base and resumes removals.
 */
export const diffTags = ({ base, local, remote, eligible, firstSync = false }: DiffTagsOptions): TagDiff => {
  const push = new Map<string, { add: string[]; remove: string[] }>();
  const pull = new Map<string, { add: string[]; remove: string[] }>();
  if (eligible.size === 0) {
    return { push, pull };
  }

  const ids = new Set<string>([...(base?.keys() ?? []), ...local.keys(), ...remote.keys()]);
  for (const id of ids) {
    const localTags = local.get(id) ?? EMPTY;
    const remoteTags = remote.get(id) ?? EMPTY;
    const baseTags = base?.get(id) ?? EMPTY;

    for (const uri of eligible) {
      const inLocal = localTags.has(uri);
      const inRemote = remoteTags.has(uri);

      if (!base) {
        // Additive only — see the doc comment above.
        if (inLocal && !inRemote && !firstSync) {
          record(push, id, 'add', uri);
        } else if (inRemote && !inLocal) {
          record(pull, id, 'add', uri);
        }
        continue;
      }

      const inBase = baseTags.has(uri);
      const localChanged = inLocal !== inBase;
      const remoteChanged = inRemote !== inBase;
      if (localChanged && remoteChanged) {
        // Both flipped, therefore to the same value: already converged.
        continue;
      }
      if (localChanged) {
        record(push, id, inLocal ? 'add' : 'remove', uri);
      } else if (remoteChanged) {
        record(pull, id, inRemote ? 'add' : 'remove', uri);
      }
    }
  }

  return { push, pull };
};
