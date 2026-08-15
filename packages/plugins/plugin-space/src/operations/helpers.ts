// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Type } from '@dxos/echo';

import { SpaceCapabilities } from '#types';

export type SpaceOperationConfig = {
  createInvitationUrl: (invitationCode: string) => string;
};

export const SpaceOperationConfig = Capability.makeSingleton<SpaceOperationConfig>()(
  'org.dxos.plugin.space.operationConfig',
);

/** The contributed identity rule for a typename, or `undefined` when no plugin owns one. */
export const resolveIdentitySpec = Effect.fnUntraced(function* (typename: string) {
  const specs = yield* Capability.getAll(SpaceCapabilities.IdentitySpec);
  return specs.find((spec) => Type.getTypename(spec.type) === typename);
});
