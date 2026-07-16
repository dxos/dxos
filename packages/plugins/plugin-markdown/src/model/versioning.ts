//
// Copyright 2026 DXOS.org
//

import { Obj, Ref, Text as EchoText } from '@dxos/echo';
import { checkoutVersion } from '@dxos/echo-client';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';

import { Markdown, Versioning } from '../types';
import { merge3 } from './diff';

/** Initializes the history struct on first use so existing documents need no migration. */
export const ensureHistory = (doc: Markdown.Document): Versioning.History => {
  if (!doc.history) {
    Obj.update(doc, (mutableDoc) => {
      mutableDoc.history = { branches: [], versions: [] };
    });
  }
  return doc.history!;
};

const getHeads = (text: Text.Text): string[] => {
  const version = Obj.version(text);
  invariant(version.versioned && version.automergeHeads, 'text is not versioned (not persisted?)');
  return [...version.automergeHeads];
};

/** @returns The Text content at the given automerge heads (read-only time travel). */
export const contentAt = (text: Text.Text, heads: readonly string[]): string => {
  const snapshot = checkoutVersion(text, [...heads]) as { content?: string };
  return snapshot?.content ?? '';
};

export type CreateCheckpointProps = { target?: Text.Text; name: string; message?: string; creator?: string };

export const createCheckpoint = (doc: Markdown.Document, props: CreateCheckpointProps): Versioning.Version => {
  const text = props.target ?? doc.content.target;
  invariant(text, 'document content not loaded');
  const version = Versioning.makeVersion({
    name: props.name,
    target: Ref.make(text),
    heads: getHeads(text),
    ...(props.message !== undefined && { message: props.message }),
    ...(props.creator !== undefined && { creator: props.creator }),
  });
  const history = ensureHistory(doc);
  Obj.update(doc, () => {
    history.versions.push(version);
  });
  return version;
};

/** Find the branch record owning a given Text (undefined for the root). */
export const findBranch = (doc: Markdown.Document, text: Text.Text): Versioning.Branch | undefined =>
  doc.history?.branches.find((branch) => branch.content.target?.id === text.id);

export type CreateBranchProps = {
  name: string;
  from?: { target: Text.Text; heads?: readonly string[] };
  creator?: string;
};

export const createBranch = (doc: Markdown.Document, props: CreateBranchProps): Versioning.Branch => {
  const parent = props.from?.target ?? doc.content.target;
  invariant(parent, 'document content not loaded');
  const anchor = props.from?.heads ? [...props.from.heads] : getHeads(parent);
  const baseContent = contentAt(parent, anchor);

  const branchText = Text.make({ content: baseContent });
  const db = Obj.getDatabase(doc);
  invariant(db, 'document not in a database');
  db.add(branchText);
  Obj.setParent(branchText, doc);

  const branch = Versioning.makeBranch({
    name: props.name,
    content: Ref.make(branchText),
    parent: Ref.make(parent),
    anchor,
    ...(props.creator !== undefined && { creator: props.creator }),
  });

  const history = ensureHistory(doc);
  Obj.update(doc, () => {
    history.branches.push(branch);
  });
  // The anchor must stay addressable by name in the timeline.
  if (!history.versions.some((version) => sameHeads(version.heads, anchor))) {
    const version = Versioning.makeVersion({ name: `fork: ${props.name}`, target: Ref.make(parent), heads: anchor });
    Obj.update(doc, () => {
      history.versions.push(version);
    });
  }
  return branch;
};

/** Applies the checkpoint's content to the tip as a new forward edit — history is never rewritten. */
export const restore = (doc: Markdown.Document, version: Versioning.Version): void => {
  const text = version.target.target;
  invariant(text, 'checkpoint target not loaded');
  const historical = contentAt(text, version.heads);
  Obj.update(text, () => {
    EchoText.update(text, 'content', historical);
  });
};

export type MergeResult = { conflicts: number };

/**
 * 3-way merge: base = parent@anchor, ours = parent tip, theirs = branch tip.
 * Conflicting hunks are left in the document with git-style markers for manual cleanup.
 */
export const mergeBranch = (doc: Markdown.Document, branch: Versioning.Branch): MergeResult => {
  invariant(branch.status === 'active', 'branch is not active');
  const parent = branch.parent.target;
  const branchText = branch.content.target;
  invariant(parent && branchText, 'branch refs not loaded');

  const base = contentAt(parent, branch.anchor);
  const { text, conflicts } = merge3({ base, ours: parent.content, theirs: branchText.content });
  Obj.update(parent, () => {
    EchoText.update(parent, 'content', text);
  });
  Obj.update(doc, () => {
    branch.status = 'merged';
    branch.mergedAt = new Date().toISOString();
  });
  createCheckpoint(doc, { name: `merge: ${branch.name}`, target: parent });
  return { conflicts };
};

/** Archives the branch; its Text is retained for recovery. */
export const discardBranch = (doc: Markdown.Document, branch: Versioning.Branch): void => {
  Obj.update(doc, () => {
    branch.status = 'archived';
  });
};

const sameHeads = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((head) => b.includes(head));
