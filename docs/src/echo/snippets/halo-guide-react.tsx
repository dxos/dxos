//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import React, { useState } from 'react';

import { type Client } from '@dxos/client';
import { Identity, Invitation, Space } from '@dxos/halo';
import {
  makeIdentityService,
  makeSpaceService,
} from '@dxos/halo-adapter-client';
import {
  HaloProvider,
  useCredentials,
  useDevices,
  useHaloInvitations,
  useIdentity,
  useInvitationFlow,
  useMembers,
  useSpace,
  useSpaceInvitations,
  useSpaces,
} from '@dxos/halo-react';
import { type SpaceId } from '@dxos/keys';

declare const client: Client;

// #region provider
const services = Context.empty().pipe(
  Context.add(Identity.Service, makeIdentityService(client)),
  Context.add(Space.Service, makeSpaceService(client)),
);

export const App = () => (
  <HaloProvider services={services}>
    <Profile />
  </HaloProvider>
);
// #endregion provider

// #region identity
export const Profile = () => {
  const identity = useIdentity();
  const devices = useDevices();
  const credentials = useCredentials();
  if (!identity) {
    return <p>No identity yet.</p>;
  }

  const recovery = credentials.filter((c) => c.recovery && !c.recovery.revoked);
  return (
    <p>
      {identity.displayName} on {devices.length} devices, with {recovery.length}{' '}
      recovery credentials.
    </p>
  );
};
// #endregion identity

// #region spaces
export const SpaceList = () => {
  const spaces = useSpaces();
  return (
    <ul>
      {spaces.map((space) => (
        <li key={space.id}>
          <Members spaceId={space.id} />
        </li>
      ))}
    </ul>
  );
};

export const Members = ({ spaceId }: { spaceId: SpaceId }) => {
  const space = useSpace(spaceId);
  const members = useMembers(spaceId);
  return (
    <>
      {space?.name}:{' '}
      {members.map((member) => member.displayName ?? member.did).join(', ')}
    </>
  );
};
// #endregion spaces

// #region invitations
export const Invite = ({ spaceId }: { spaceId: SpaceId }) => {
  const [flow, setFlow] = useState<Invitation.Flow>();
  const { event, code } = useInvitationFlow(flow);

  const share = () =>
    // eslint-disable-next-line @dxos/rules/no-effect-run-promise -- readers run Effects with the published API.
    Effect.runPromise(
      Space.share(spaceId, { authMethod: 'shared-secret' }).pipe(
        Effect.provide(services),
      ),
    ).then(setFlow);

  if (!flow) {
    return <button onClick={share}>Invite</button>;
  }
  return (
    <p>
      Code: {code}
      {event?._tag === 'readyForAuthentication' && ` Auth: ${event.authCode}`}
    </p>
  );
};

// Every flow this device has open, for a space or for the identity.
export const OpenInvitations = ({ spaceId }: { spaceId: SpaceId }) => {
  const forSpace = useSpaceInvitations(spaceId);
  const forDevices = useHaloInvitations();
  return (
    <p>
      {forSpace.length} space and {forDevices.length} device invitations open.
    </p>
  );
};
// #endregion invitations
