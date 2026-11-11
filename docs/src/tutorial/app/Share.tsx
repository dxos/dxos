//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Popover from '@dxos/react-ui/Popover';

import { acceptInvite, createInvite } from '../sharing.ts';

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
  const handleOpen = async (open: boolean) => {
    if (open) {
      setCode(undefined);
      const code = await createInvite(space);
      setCode(code);
      await navigator.clipboard?.writeText(code).catch(() => {});
    }
  };

  return (
    <Popover.Root onOpenChange={({ open }) => void handleOpen(open)}>
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
    acceptInvite(client, code.trim()).then(
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
