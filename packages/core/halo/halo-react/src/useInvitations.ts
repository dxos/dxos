//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Identity, type Invitation, Space } from '@dxos/halo';
import { type SpaceId } from '@dxos/keys';

import { useHaloServices } from './useHaloServices';
import { useReactive } from './useReactive';

const EMPTY: readonly Invitation.Flow[] = [];

/**
 * Returns the active (host-created) invitation flows for a space. Reactive. Replaces
 * `@dxos/react-client`'s `useSpaceInvitations`. Drive an individual flow through the
 * `Invitation` verbs (`events` / `authenticate` / `cancel` / `code`).
 */
export const useSpaceInvitations = (spaceId?: SpaceId): readonly Invitation.Flow[] => {
  const service = Context.get(useHaloServices(), Space.Service);
  return useReactive(
    spaceId ? service.invitations(spaceId) : Effect.succeed(EMPTY),
    spaceId ? service.invitationChanges(spaceId) : Stream.empty,
    [service, spaceId],
  );
};

/**
 * Returns the active device-invitation flows for the local identity. Reactive. Replaces
 * `useHaloInvitations`.
 */
export const useHaloInvitations = (): readonly Invitation.Flow[] => {
  const service = Context.get(useHaloServices(), Identity.Service);
  return useReactive(service.invitations, service.invitationChanges, [service]);
};
