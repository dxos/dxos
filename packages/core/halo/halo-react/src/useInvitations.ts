//
// Copyright 2026 DXOS.org
//

import { Atom, Result, useAtomValue } from '@effect-atom/atom-react';
import * as Stream from 'effect/Stream';
import { useMemo } from 'react';

import { Identity, type Invitation, Space } from '@dxos/halo';
import { type SpaceId } from '@dxos/keys';

import { useHaloServices } from './HaloProvider';

const EMPTY: readonly Invitation.Flow[] = [];

/**
 * Returns the active (host-created) invitation flows for a space. Reactive. Replaces
 * `@dxos/react-client`'s `useSpaceInvitations`. Drive an individual flow through the
 * `Invitation` verbs (`events` / `authenticate` / `cancel` / `code`).
 */
export const useSpaceInvitations = (spaceId?: SpaceId): readonly Invitation.Flow[] => {
  const services = useHaloServices();
  const atom = useMemo(
    () => Atom.make((spaceId ? Space.invitations(spaceId) : Stream.empty).pipe(Stream.provideContext(services))),
    [services, spaceId],
  );
  return Result.getOrElse(useAtomValue(atom), () => EMPTY);
};

/**
 * Returns the active device-invitation flows for the local identity. Reactive. Replaces
 * `useHaloInvitations`.
 */
export const useHaloInvitations = (): readonly Invitation.Flow[] => {
  const services = useHaloServices();
  const atom = useMemo(() => Atom.make(Identity.invitations.pipe(Stream.provideContext(services))), [services]);
  return Result.getOrElse(useAtomValue(atom), () => EMPTY);
};
