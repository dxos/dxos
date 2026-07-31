//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Key, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

/**
 * Named checkpoint: a pointer to the automerge heads of a Text's backing document.
 * Heads are content-addressed change hashes, stable across peers, so a checkpoint is zero-copy.
 * Generic over any object holding a `history` field (see model.ts).
 */
export const Version = Schema.mutable(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    target: Ref.Ref(Text.Text),
    heads: Schema.mutable(Schema.Array(Schema.String)),
    /**
     * Core-branch registry key when the checkpoint was taken on a branch (the branch's heads live in
     * the branch document, not the root's, so viewing must resolve the branch). Absent = the base
     * document. Matches {@link Branch.key}.
     */
    branch: Schema.optional(Schema.String),
    createdAt: Schema.String,
    creator: Schema.optional(Schema.String),
    message: Schema.optional(Schema.String),
  }),
);
export interface Version extends Schema.Schema.Type<typeof Version> {}

export const BranchStatus = Schema.Literal('active', 'merged', 'archived');
export type BranchStatus = Schema.Schema.Type<typeof BranchStatus>;

/**
 * A draft branch of a parent Text forked at a specific revision (anchor heads).
 *
 * The record is product metadata only (label, status, provenance). For core branches (`key` set)
 * the branch content is an ECHO-core branch of the parent object itself — same object id, shared
 * automerge history, CRDT merge-back — owned by the space-root branch registry, which `key` indexes.
 * Legacy content-copy branches (pre core-branching) carry a separate forked Text in `content` and
 * merge textually; they remain readable/mergeable until migrated (convergence plan stage 4).
 */
export const Branch = Schema.mutable(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    /** Core-branch registry name (the space-root registry key on the parent object). */
    key: Schema.optional(Schema.String),
    /** Legacy content-copy branches only: the forked Text. Core branches have no separate Text. */
    content: Schema.optional(Ref.Ref(Text.Text)),
    parent: Ref.Ref(Text.Text),
    anchor: Schema.mutable(Schema.Array(Schema.String)),
    status: BranchStatus,
    createdAt: Schema.String,
    creator: Schema.optional(Schema.String),
    /** Branch intent: one `suggestion` per author (review model) vs an explicit `draft` fork. Absent ⇒ draft. */
    kind: Schema.optional(Schema.Literal('suggestion', 'draft')),
    mergedAt: Schema.optional(Schema.String),
  }),
);
export interface Branch extends Schema.Schema.Type<typeof Branch> {}

export const History = Schema.mutable(
  Schema.Struct({
    branches: Schema.mutable(Schema.Array(Branch)),
    versions: Schema.mutable(Schema.Array(Version)),
  }),
);
export interface History extends Schema.Schema.Type<typeof History> {}

export type MakeVersionProps = Pick<Version, 'target' | 'heads' | 'name'> &
  Partial<Pick<Version, 'branch' | 'creator' | 'message'>>;

/** Constructs a Version checkpoint record with a generated id and creation timestamp. */
export const makeVersion = (props: MakeVersionProps): Version => ({
  id: Key.EntityId.random(),
  createdAt: new Date().toISOString(),
  ...props,
});

export type MakeBranchProps = Pick<Branch, 'parent' | 'anchor' | 'name'> &
  Partial<Pick<Branch, 'key' | 'content' | 'creator' | 'kind'>>;

/** Constructs an active Branch record with a generated id and creation timestamp. */
export const makeBranch = (props: MakeBranchProps): Branch => ({
  id: Key.EntityId.random(),
  status: 'active',
  createdAt: new Date().toISOString(),
  ...props,
});
