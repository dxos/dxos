// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { DXN, Filter, type Obj, Type } from '@dxos/echo';
import { type PublicKey } from '@dxos/keys';

import * as SpaceCapabilities from '../types/SpaceCapabilities.ts';

export type SpaceOperationConfig = {
  createInvitationUrl: (invitationCode: string) => string;
  createJoinUrl: (spaceKey: PublicKey) => string;
  /** Absent on a host with no public origin to link to. */
  createObjectUrl?: (object: Obj.Unknown) => string | undefined;
};

export const SpaceOperationConfig = Capability.makeSingleton<SpaceOperationConfig>()(
  'org.dxos.plugin.space.operationConfig',
);

/** The contributed identity rule for a typename, or `undefined` when no plugin owns one. */
export const resolveIdentitySpec = Effect.fnUntraced(function* (typename: string) {
  const specs = yield* Capability.getAll(SpaceCapabilities.IdentitySpec);
  return specs.find((spec) => Type.getTypename(spec.type) === typename);
});

/**
 * The key filter for a type a caller names: a bare typename (`org.example.type`), or a DXN, as an encoded object
 * carries it (`dxn:org.example.type:0.1.0`), whose version pins that registration. A malformed DXN is matched as
 * written, so it finds no type rather than an unpinned version of one.
 */
export const typeKeyFilter = (typename: string): Filter.Any => {
  const dxn = DXN.tryMake(typename);
  return dxn === undefined ? Filter.key(typename) : Filter.key(DXN.getName(dxn), { version: DXN.getVersion(dxn) });
};
