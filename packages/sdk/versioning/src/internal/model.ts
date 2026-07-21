//
// Copyright 2026 DXOS.org
//

import { type Database, Text as EchoText, Obj, Ref } from '@dxos/echo';
import { checkoutVersion } from '@dxos/echo-client';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';

import { merge3 } from '../diff';
import * as Versioning from './types';

/** Any ECHO object that carries a versioning history (e.g. a markdown document). */
export type VersionedObject = Obj.Unknown & { history?: Versioning.History | undefined };

/** Initializes the history struct on first use so existing documents need no migration. */
export const ensureHistory = (doc: VersionedObject): Versioning.History => {
  if (!doc.history) {
    Obj.update(doc, (doc) => {
      doc.history = { branches: [], versions: [] };
    });
  }
  const history = doc.history;
  invariant(history, 'history not initialized');
  return history;
};

const getHeads = (text: Text.Text): string[] => {
  const version = Obj.version(text);
  invariant(version.versioned && version.automergeHeads, 'text is not versioned (not persisted?)');
  return [...version.automergeHeads];
};

/** @returns The Text content at the given automerge heads (read-only time travel). */
export const contentAt = (text: Text.Text, heads: readonly string[]): string => {
  // `checkoutVersion` returns `unknown` (raw historical data) — narrow via runtime checks.
  const snapshot = checkoutVersion(text, [...heads]);
  if (snapshot && typeof snapshot === 'object' && 'content' in snapshot) {
    const { content } = snapshot;
    return typeof content === 'string' ? content : '';
  }
  return '';
};

export type CreateCheckpointProps = {
  target: Text.Text;
  name: string;
  message?: string;
  creator?: string;
  /**
   * Core-branch key when checkpointing a branch: `target` must be the branch-bound Text (its
   * `automergeHeads` are the branch's, and viewing later resolves that branch). Omit for the base.
   */
  branch?: string;
};

/**
 * Records a named checkpoint of the target Text's current automerge heads and appends it to
 * the object's history. Zero-copy: only the heads are stored.
 */
export const createCheckpoint = (doc: VersionedObject, props: CreateCheckpointProps): Versioning.Version => {
  const text = props.target;
  // A checkpoint records the target's current tip. Viewing a checkpoint no longer pins the live
  // object (it renders a detached snapshot), so the target is always at its tip here; the "don't
  // checkpoint while viewing a revision" affordance is enforced in the UI (the disabled button).
  const version = Versioning.makeVersion({
    name: props.name,
    target: Ref.make(text),
    heads: getHeads(text),
    ...(props.branch !== undefined && { branch: props.branch }),
    ...(props.message !== undefined && { message: props.message }),
    ...(props.creator !== undefined && { creator: props.creator }),
  });
  const history = ensureHistory(doc);
  Obj.update(doc, () => {
    history.versions.push(version);
  });

  // Return the stored record (the pushed plain object is detached from the database).
  const stored = history.versions.find(({ id }) => id === version.id);
  invariant(stored, 'checkpoint not stored');
  return stored;
};

/** Display label for a checkpoint: its name, or the formatted creation time when unnamed. */
export const versionLabel = (version: Versioning.Version): string =>
  version.name || new Date(version.createdAt).toLocaleString();

/** Display label for a branch: its name, or the formatted creation time when unnamed. */
export const branchLabel = (branch: Versioning.Branch): string =>
  branch.name || new Date(branch.createdAt).toLocaleString();

/**
 * Find the legacy content-copy branch record owning a given Text (undefined for the root).
 * Core branches share the parent's object id, so they cannot be identified by a Text instance.
 */
export const findBranch = (doc: VersionedObject, text: Text.Text): Versioning.Branch | undefined =>
  doc.history?.branches.find((branch) => branch.content?.target?.id === text.id);

/** Whether the branch is an ECHO-core branch (registry-backed) vs a legacy content-copy branch. */
export const isCoreBranch = (branch: Versioning.Branch): boolean => branch.key != null;

export type CreateBranchProps = {
  name: string;
  parent: Text.Text;
  heads?: readonly string[];
  creator?: string;
  kind?: Versioning.Branch['kind'];
};

/**
 * Forks a draft branch: an ECHO-core branch of the parent Text at the anchor heads (defaults to
 * the parent's current heads) — same object id, shared automerge history, CRDT merge-back. The
 * record stores presentation metadata keyed into the core registry via `key`; the anchor is
 * auto-checkpointed so the fork point stays addressable in the timeline.
 */
export const createBranch = async (doc: VersionedObject, props: CreateBranchProps): Promise<Versioning.Branch> => {
  const parent = props.parent;
  const anchor = props.heads ? [...props.heads] : getHeads(parent);
  const db = Obj.getDatabase(doc);
  invariant(db, 'document not in a database');

  const branch = Versioning.makeBranch({
    name: props.name,
    parent: Ref.make(parent),
    anchor,
    ...(props.creator !== undefined && { creator: props.creator }),
    ...(props.kind !== undefined && { kind: props.kind }),
  });
  // The record id doubles as the registry branch name: unique per object, stable, and free of
  // user-label collisions (the display name lives on the record only).
  branch.key = branch.id;
  await db.createBranch(parent.id, branch.key, { fromHeads: anchor });

  const history = ensureHistory(doc);
  Obj.update(doc, () => {
    history.branches.push(branch);
  });
  // The anchor must stay addressable by name in the timeline.
  if (!history.versions.some((version) => sameHeads(version.heads, anchor))) {
    const version = Versioning.makeVersion({
      name: `fork: ${branchLabel(branch)}`,
      target: Ref.make(parent),
      heads: anchor,
    });
    Obj.update(doc, () => {
      history.versions.push(version);
    });
  }

  // Return the stored record (the pushed plain object is detached from the database).
  const stored = history.branches.find(({ id }) => id === branch.id);
  invariant(stored, 'branch not stored');
  return stored;
};

// Viewing a checkpoint no longer pins the live object: the caller reads the historical value with
// `contentAt` (or `Obj.getVersion` for the full snapshot) and renders it, so only that surface shows
// history — the live object is never mutated. (The former `viewVersion`/`clearVersionView` pin is gone.)

/**
 * Applies the checkpoint's content to the tip as a new forward edit — history is never rewritten. For
 * a branch checkpoint, `text` is the branch-bound Text; the restore lands on the branch, not the base.
 * No pin to clear: the live object was never mutated by viewing.
 */
export const restore = (doc: VersionedObject, version: Versioning.Version, text = version.target.target): void => {
  invariant(text, 'checkpoint target not loaded');
  const historical = contentAt(text, version.heads);
  Obj.update(text, () => {
    EchoText.update(text, 'content', historical);
  });
};

export type MergeResult = { conflicts: number };

/**
 * Bind to a core branch's content: a caller-owned, writable live Text whose reads/writes land on
 * the branch document only. The caller must `dispose()` the binding.
 */
export const bindBranch = async (
  doc: VersionedObject,
  branch: Versioning.Branch,
): Promise<Database.BranchBinding<Text.Text>> => {
  const stored = resolveBranch(doc, branch);
  invariant(stored.key, 'not a core branch (legacy content-copy branches carry their Text in `content`)');
  const parent = stored.parent.target;
  invariant(parent, 'branch parent not loaded');
  const db = Obj.getDatabase(doc);
  invariant(db, 'document not in a database');
  return db.branch(parent, stored.key);
};

/**
 * Merge the branch back into its parent. Core branches merge via the CRDT (`db.mergeBranch` —
 * shared fork ancestry, character-level, conflict-free; the registry entry is removed). Legacy
 * content-copy branches fall back to a textual 3-way merge (base = parent@anchor, ours = parent
 * tip, theirs = branch tip) with git-style markers left for manual cleanup — retained until
 * convergence-plan stage 4 for external/imported conflicts.
 */
export const mergeBranch = async (doc: VersionedObject, branch: Versioning.Branch): Promise<MergeResult> => {
  // Callers may hold a detached copy of the record — mutate the stored one.
  const stored = resolveBranch(doc, branch);
  invariant(stored.status === 'active', 'branch is not active');
  const parent = stored.parent.target;
  invariant(parent, 'branch parent not loaded');

  let conflicts = 0;
  if (stored.key) {
    const db = Obj.getDatabase(doc);
    invariant(db, 'document not in a database');
    await db.mergeBranch(parent.id, stored.key, { deleteAfter: true });
  } else {
    const branchText = stored.content?.target;
    invariant(branchText, 'branch refs not loaded');
    const base = contentAt(parent, stored.anchor);
    const merged = merge3({ base, ours: parent.content, theirs: branchText.content });
    conflicts = merged.conflicts;
    Obj.update(parent, () => {
      EchoText.update(parent, 'content', merged.text);
    });
  }

  Obj.update(doc, () => {
    stored.status = 'merged';
    stored.mergedAt = new Date().toISOString();
  });

  createCheckpoint(doc, { name: `merge: ${branchLabel(stored)}`, target: parent });
  return { conflicts };
};

/**
 * Archives the branch; its content is retained for recovery (the legacy Text, or the core branch
 * document, which stays in the registry until stage-4 cleanup).
 */
export const discardBranch = (doc: VersionedObject, branch: Versioning.Branch): void => {
  const stored = resolveBranch(doc, branch);
  Obj.update(doc, () => {
    stored.status = 'archived';
  });
};

/**
 * Find-or-create the caller's suggestion branch (one per author). Suggestion branches are keyed by
 * `creator` and reused across edits, so a user accrues a single reviewable set of changes rather than
 * a branch per edit. Idempotent: returns the existing active suggestion branch when present.
 */
export const suggestionBranch = async (
  doc: VersionedObject,
  parent: Text.Text,
  creator: string,
): Promise<Versioning.Branch> => {
  const existing = doc.history?.branches.find(
    (branch) => branch.status === 'active' && branch.kind === 'suggestion' && branch.creator === creator,
  );
  if (existing) {
    return existing;
  }

  return createBranch(doc, { name: `suggestion: ${creator}`, parent, creator, kind: 'suggestion' });
};

/**
 * Archives the branch when it carries no changes vs its fork point (parent@anchor) — e.g. once the
 * last suggested hunk has been accepted or rejected. Keeps the timeline free of empty suggestion
 * branches. Returns whether it archived.
 */
export const archiveIfEmpty = async (doc: VersionedObject, branch: Versioning.Branch): Promise<boolean> => {
  const stored = resolveBranch(doc, branch);
  if (stored.status !== 'active') {
    return false;
  }
  const parent = stored.parent.target;
  invariant(parent, 'branch parent not loaded');
  const base = contentAt(parent, stored.anchor);

  let content: string;
  if (stored.key) {
    const binding = await bindBranch(doc, stored);
    try {
      content = binding.object.content;
    } finally {
      binding.dispose();
    }
  } else {
    content = stored.content?.target?.content ?? '';
  }

  if (content === base) {
    discardBranch(doc, stored);
    return true;
  }
  return false;
};

const resolveBranch = (doc: VersionedObject, branch: Versioning.Branch): Versioning.Branch => {
  const stored = doc.history?.branches.find(({ id }) => id === branch.id);
  invariant(stored, `branch not found: ${branch.id}`);
  return stored;
};

const sameHeads = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((head) => b.includes(head));
