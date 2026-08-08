//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Type } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';

/**
 * Public properties for an identity.
 * The subject identity is addressed by DID; the profile object itself is an ECHO object addressable by EID.
 * Replaces the legacy `IdentityProfile`/`MemberProfile` credential assertions (`ProfileDocument`).
 *
 * Display properties alone are not sufficient to act on a contact: admitting an identity to a
 * Keyhive group requires their signed `ContactCard` (id + prekey). A key-material field will be
 * added once the Keyhive service layer defines its serialized form.
 *
 * BlueSky/atproto overlap: this is the analogue of the `app.bsky.actor.profile` record
 * (displayName/avatar), and DID addressing is shared — atproto uses `did:plc`/`did:web` where
 * HALO uses `did:halo`; a generalized DID primitive would allow profiles to reference either.
 * Handle → DID resolution (atproto handles) is a HALO Hub concern, not part of this schema.
 */
export class Profile extends Type.makeObject<Profile>(DXN.make('org.dxos.halo.profile', '0.1.0'))(
  Schema.Struct({
    /** DID of the identity this profile describes. */
    did: IdentityDid,
    displayName: Schema.optional(Schema.String),
    avatarUrl: Schema.optional(Format.URL),
    /** Application-defined properties. */
    data: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
  }).pipe(Annotation.LabelAnnotation.set(['displayName'])),
) {}

export const make = (props: Obj.MakeProps<typeof Profile>): Profile => Obj.make(Profile, props);
