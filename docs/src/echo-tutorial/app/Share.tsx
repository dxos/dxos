//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import {
  Invitation_AuthMethod,
  Invitation_State,
  InvitationEncoder,
} from '@dxos/client/invitations';
import { SpaceId } from '@dxos/keys';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Popover from '@dxos/react-ui/Popover';

export type ShareProps = {
  client: Client;
  space: Space;
  onJoin: (space: Space) => void;
};

/** The toolbar's Invite and Join: one copies a code for the space, the other opens the space a code names. */
export const Share = ({ client, space, onJoin }: ShareProps) => (
  <>
    <Invite space={space} />
    <Join client={client} onJoin={onJoin} />
  </>
);

const Invite = ({ space }: { space: Space }) => {
  const [code, setCode] = useState<string>();
  // #region invite
  const handleOpen = (open: boolean) => {
    if (!open) {
      return;
    }
    setCode(undefined);
    const invitation = space.share({ authMethod: Invitation_AuthMethod.NONE });
    invitation.subscribe((invitation) => {
      if (invitation.state === Invitation_State.CONNECTING) {
        setCode(InvitationEncoder.encode(invitation));
      }
    });
  };
  // #endregion
  useEffect(() => {
    if (code) {
      void navigator.clipboard?.writeText(code).catch(() => {});
    }
  }, [code]);

  return (
    <Popover.Root onOpenChange={({ open }) => handleOpen(open)}>
      <Popover.Trigger asChild>
        <Button.Root icon='ph--user-plus--regular' label='Invite' iconOnly />
      </Popover.Trigger>
      <Popover.Content>
        <Popover.Body classNames='flex flex-col gap-2'>
          <p className='text-sm text-description'>
            {code
              ? 'Copied. Send this code to the person you are inviting.'
              : 'Creating an invitation…'}
          </p>
          {code && (
            <Input.Root
              aria-label='Invitation code'
              readOnly
              value={code}
              onFocus={(event) => event.target.select()}
            />
          )}
        </Popover.Body>
      </Popover.Content>
    </Popover.Root>
  );
};

// #region join
/** Joins the space `code` invites to, and resolves with it once it is open. */
const joinSpace = async (client: Client, code: string) => {
  const invitation = client.spaces.join(InvitationEncoder.decode(code));
  const { spaceId } = await invitation.wait();
  if (!SpaceId.isValid(spaceId)) {
    throw new Error('The invitation names no space.');
  }
  // The space joins the client's list a moment after the invitation succeeds.
  const space =
    client.spaces.get(spaceId) ??
    (await new Promise<Space>((resolve) => {
      const subscription = client.spaces.subscribe(() => {
        const space = client.spaces.get(spaceId);
        if (space) {
          subscription.unsubscribe();
          resolve(space);
        }
      });
    }));
  await space.waitUntilReady();
  return space;
};
// #endregion

const Join = ({
  client,
  onJoin,
}: {
  client: Client;
  onJoin: (space: Space) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string>();
  const handleJoin = () => {
    setJoining(true);
    setError(undefined);
    joinSpace(client, code.trim()).then(
      (space) => {
        setJoining(false);
        setOpen(false);
        setCode('');
        onJoin(space);
      },
      (error) => {
        setJoining(false);
        setError(String(error));
      },
    );
  };

  return (
    <Popover.Root open={open} onOpenChange={({ open }) => setOpen(open)}>
      <Popover.Trigger asChild>
        <Button.Root icon='ph--sign-in--regular' label='Join' iconOnly />
      </Popover.Trigger>
      <Popover.Content>
        <Popover.Body classNames='flex flex-col gap-2'>
          <Input.Root
            aria-label='Invitation code'
            placeholder='Invitation code'
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button.Root
            label={joining ? 'Joining…' : 'Join'}
            disabled={joining || code.trim().length === 0}
            onClick={handleJoin}
          />
          {error && <p className='text-sm text-error-text'>{error}</p>}
        </Popover.Body>
      </Popover.Content>
    </Popover.Root>
  );
};
