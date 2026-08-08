//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';

/**
 * Device kind.
 * Replaces the legacy protobuf `DeviceType` enum.
 * `agent`/`agent-managed` are HALO/Hub-specific: they denote EDGE- or Hub-hosted agent devices
 * whose keys are custodied by the service rather than a user device. No Keyhive or BlueSky
 * analogue exists — atproto has no device concept at all (the PDS holds the signing keys),
 * whereas here every device is a distinct key-holding principal.
 */
export const Kind = Schema.Literal('unknown', 'browser', 'native', 'mobile', 'agent', 'agent-managed');
export type Kind = typeof Kind.Type;

/**
 * Information about a specific user device.
 * A device is a key-identified principal (a Keyhive `Individual`), addressed by a DID derived from
 * its public key; the device object itself is addressable by EID.
 * Replaces the legacy `DeviceProfile` credential assertion (`DeviceProfileDocument`).
 */
export class Device extends Type.makeObject<Device>(DXN.make('org.dxos.halo.device', '0.1.0'))(
  Schema.Struct({
    // TODO(burdon): Generalize `IdentityDid` to a shared DID primitive for all key-derived principals.
    /** DID derived from the device public key. */
    did: IdentityDid,
    /** User-assigned label. */
    label: Schema.optional(Schema.String),
    kind: Schema.optional(Kind),
    platform: Schema.optional(Schema.String),
    platformVersion: Schema.optional(Schema.String),
    architecture: Schema.optional(Schema.String),
    os: Schema.optional(Schema.String),
    osVersion: Schema.optional(Schema.String),
  }).pipe(Annotation.LabelAnnotation.set(['label'])),
) {}

export const make = (props: Obj.MakeProps<typeof Device>): Device => Obj.make(Device, props);
