//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { EID, IdentityDid } from '@dxos/keys';

/**
 * Capability level granted to a group member, matching the Keyhive `Access` enum
 * (`Pull`/`Read`/`Edit`/`Admin`). Levels are ordered; each implies all lower levels:
 * pull < read < edit < admin. `pull` (replicate ciphertext without decrypting) is the level
 * granted to trust-minimized relays such as HALO Hub/EDGE sync services.
 * Replaces the legacy `SpaceMember.Role` enum (READER/EDITOR/ADMIN/OWNER).
 */
export const Access = Schema.Literal('pull', 'read', 'edit', 'admin');
export type Access = typeof Access.Type;

/**
 * Addresses a group member: an individual identity or device (DID), or a nested group,
 * space, or document (EID).
 */
export const Subject = Schema.Union(IdentityDid, EID.Schema);
export type Subject = typeof Subject.Type;

/**
 * Group membership entry.
 */
export const Member = Schema.Struct({
  subject: Subject,
  access: Access,
});
export type Member = typeof Member.Type;

/**
 * Abstraction of a group of users (with identities).
 * Mirrors a Keyhive `Group`: a mutable set of principals with attenuable capabilities;
 * groups may nest (members addressed by EID may themselves be groups).
 *
 * This object is a materialized view: the authoritative membership state is the signed
 * delegation/revocation DAG maintained by Keyhive (with issuers, causal ordering, and
 * conflict resolution). This projection exists for query/display and must never be treated
 * as the source of truth for authorization decisions.
 */
export class Group extends Type.makeObject<Group>(DXN.make('org.dxos.halo.group', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    members: Schema.Array(Member),
  }).pipe(Annotation.LabelAnnotation.set(['name'])),
) {}

export const make = (props: Obj.MakeProps<typeof Group>): Group => Obj.make(Group, props);
