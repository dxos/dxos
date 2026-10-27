//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as SpaceInvitationOperation from '@dxos/app-toolkit/SpaceInvitationOperation';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { useSpaces } from '@dxos/react-client/echo';
import { useContacts } from '@dxos/react-client/halo';
import { SpaceInvitationCard } from '@dxos/shell/react';

export type SpaceInvitationContainerProps = AppSurface.SpaceInvitationData;

/**
 * Renders an invitation message's space-invitation block. Joined-ness is read live from the
 * client's spaces, so the card switches from Join to Open space without any stored state; joining
 * does not ack, since the message is kept once it has been stored.
 */
export const SpaceInvitationContainer = ({
  spaceKey: spaceKeyHex,
  role,
  spaceName,
  sender,
}: SpaceInvitationContainerProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const spaces = useSpaces({ all: true });
  const contacts = useContacts();
  const [pending, setPending] = useState(false);
  const spaceKey = useMemo(() => PublicKey.safeFrom(spaceKeyHex), [spaceKeyHex]);
  const joined = !!spaceKey && spaces.some((space) => space.key.equals(spaceKey));
  const contact = sender?.identityDid ? contacts.find((contact) => contact.did === sender.identityDid) : undefined;

  // The operation joins when needed and switches to the space either way, so Join and Open share it.
  const handleOpen = useCallback(() => {
    setPending(true);
    void invokePromise(SpaceInvitationOperation.JoinBySpaceKey, { spaceKey: spaceKeyHex })
      .then(({ error }) => error && log.warn('failed to open space invitation', { error }))
      .finally(() => setPending(false));
  }, [invokePromise, spaceKeyHex]);

  if (!spaceKey) {
    return null;
  }

  return (
    <SpaceInvitationCard
      sender={contact}
      senderName={sender?.name}
      spaceKey={spaceKey}
      spaceName={spaceName}
      role={role}
      joined={joined}
      pending={pending}
      onJoin={handleOpen}
      onOpen={handleOpen}
    />
  );
};
