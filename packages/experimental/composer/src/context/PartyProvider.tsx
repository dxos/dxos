//
// Copyright 2022 DXOS.org
//

import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { InvitationDescriptor } from '@dxos/client';
import type { Party } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { useClient, useParties, usePartyInvitations, useSecretProvider } from '@dxos/react-client';
import { Button, Group, Input } from '@dxos/react-ui';

export interface PartyContextValue {
  party?: Party;
}

const textEncoder = new TextEncoder();

export const PartyContext = createContext<PartyContextValue>({});

export const PartyProvider = (props: PropsWithChildren<{}>) => {
  const client = useClient();
  const parties = useParties();
  const [party, setParty] = useState<Party>();
  const [loading, setLoading] = useState<boolean>(false);
  const [invitationCodeValue, setInvitationCodeValue] = useState('');
  const partyInvitations = usePartyInvitations(party?.key);
  const [secretProvider, secretResolver, _resetSecret] = useSecretProvider<Uint8Array>();

  useEffect(() => {
    if (party) {
      void party.createInvitation();
    } else {
      secretResolver(textEncoder.encode('todo'));
    }
  }, [client, party]);

  const partyContextValue = useMemo<PartyContextValue>(() => ({ party }), [party]);

  const onCreate = useCallback(() => {
    setLoading(true);
    void client.echo
      .createParty()
      .then((party: Party) => setParty(party))
      .finally(() => setLoading(false));
  }, [client]);

  const onJoin = useCallback(async () => {
    setLoading(true);
    const parsedInvitation = InvitationDescriptor.decode(invitationCodeValue);
    const redeemeingInvitation = client.echo.acceptInvitation(parsedInvitation);
    redeemeingInvitation.authenticate(await secretProvider());
    const joinedParty = await redeemeingInvitation.getParty();
    setParty(joinedParty);
    setLoading(false);
  }, [invitationCodeValue]);

  const onInviteCodeChange = useCallback((value: string) => {
    setInvitationCodeValue(value);
  }, []);

  const inviteCodeInputProps = useMemo(
    () => ({
      className: 'flex-grow my-1',
      label: 'Invite code',
      labelVisuallyHidden: true,
      placeholder: 'Paste invite code',
      initialValue: invitationCodeValue,
      disabled: loading,
      onChange: onInviteCodeChange
    }),
    [onInviteCodeChange, loading]
  );

  return (
    <PartyContext.Provider value={partyContextValue}>
      {party ? (
        <>
          {props.children}
          <div className='fixed bottom-2 right-2 flex gap-4'>
            {partyInvitations && (
              <Button onClick={() => navigator.clipboard.writeText(partyInvitations[0].descriptor.encode().toString())}>
                Copy invite code
              </Button>
            )}
            <Button onClick={() => setParty(undefined)}>Exit space</Button>
          </div>
        </>
      ) : (
        <>
          <Group
            className='my-8 mx-auto w-72'
            label={{
              level: 1,
              className: 'text-xl text-center mb-3',
              children: 'Create or join a space'
            }}
          >
            <Button variant='primary' className='w-full' onClick={onCreate} {...(loading && { disabled: true })}>
              Create
            </Button>
            <p className='text-center'>or</p>
            <div role='none' className='flex items-center gap-2'>
              <Input {...inviteCodeInputProps} />
              <Button variant='primary' onClick={onJoin} {...(loading && { disabled: true })}>
                Join
              </Button>
            </div>
          </Group>
          {parties.length > 0 && (
            <Group
              className='my-8 mx-auto w-72 flex flex-col gap-4'
              label={{
                level: 1,
                className: 'text-xl text-center mb-3',
                children: 'Your Spaces'
              }}
            >
              {parties.map((party) => (
                <Button key={party.key.toHex()} className='width-full truncate' onClick={() => setParty(party)}>
                  {truncateKey(party.key)}
                </Button>
              ))}
            </Group>
          )}
        </>
      )}
    </PartyContext.Provider>
  );
};

export const useParty = () => useContext(PartyContext);
