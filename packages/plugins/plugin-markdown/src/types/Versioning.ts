//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Key, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

/**
 * Named checkpoint: a pointer to the automerge heads of a Text's backing document.
 * Heads are content-addressed change hashes, stable across peers, so a checkpoint is zero-copy.
 * NOTE: Deliberately not markdown-specific (targets Text, not Document) so these types can lift
 * into @dxos/schema in phase 2. See DESIGN.md.
 */
export const Version = Schema.mutable(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    target: Ref.Ref(Text.Text),
    heads: Schema.mutable(Schema.Array(Schema.String)),
    createdAt: Schema.String,
    creator: Schema.optional(Schema.String),
    message: Schema.optional(Schema.String),
  }),
);
export interface Version extends Schema.Schema.Type<typeof Version> {}

export const BranchStatus = Schema.Literal('active', 'merged', 'archived');
export type BranchStatus = Schema.Schema.Type<typeof BranchStatus>;

/**
 * A draft Text forked from a parent Text at a specific revision (anchor heads).
 * The branch tree is formed by `parent` references; the root is Document.content.
 */
export const Branch = Schema.mutable(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    content: Ref.Ref(Text.Text),
    parent: Ref.Ref(Text.Text),
    anchor: Schema.mutable(Schema.Array(Schema.String)),
    status: BranchStatus,
    createdAt: Schema.String,
    creator: Schema.optional(Schema.String),
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
  Partial<Pick<Version, 'creator' | 'message'>>;

/** Constructs a Version checkpoint record with a generated id and creation timestamp. */
export const makeVersion = (props: MakeVersionProps): Version => ({
  id: Key.EntityId.random(),
  createdAt: new Date().toISOString(),
  ...props,
});

export type MakeBranchProps = Pick<Branch, 'content' | 'parent' | 'anchor' | 'name'> & Partial<Pick<Branch, 'creator'>>;

/** Constructs an active Branch record with a generated id and creation timestamp. */
export const makeBranch = (props: MakeBranchProps): Branch => ({
  id: Key.EntityId.random(),
  status: 'active',
  createdAt: new Date().toISOString(),
  ...props,
});
