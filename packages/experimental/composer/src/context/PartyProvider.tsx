//
// Copyright 2022 DXOS.org
//

import { Buffer } from 'buffer';
import React, {
  ChangeEvent,
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import { InvitationDescriptor, Party } from '@dxos/client';
import {
  useClient,
  usePartyInvitations,
  useSecretProvider
} from '@dxos/react-client';
import { Button, Group, Input } from '@dxos/react-ui';

export interface PartyContextValue {
  party?: Party
}

export const PartyContext = createContext<PartyContextValue>({});

export const PartyProvider = (props: PropsWithChildren<{}>) => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [loading, setLoading] = useState<boolean>(false);
  const [invitationCodeValue, setInvitationCodeValue] = useState('');
  const partyInvitations = usePartyInvitations(party?.key);
  const [secretProvider, secretResolver, _resetSecret] =
    useSecretProvider<Buffer>();

  useEffect(() => {
    if (party) {
      console.log('[party]', party);
      void party.createInvitation();
    } else {
      secretResolver(Buffer.from('todo'));
    }
  }, [client, party]);

  const partyContextValue = useMemo<PartyContextValue>(
    () => ({ party }),
    [party]
  );

  const onCreate = useCallback(() => {
    setLoading(true);
    void client.echo
      .createParty()
      .then((party) => setParty(party))
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

  const onInviteCodeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    console.log('[on change]', e.target.value);
    setInvitationCodeValue(e.target.value);
  }, []);

  const inviteCodeInputProps = useMemo(
    () => ({
      className: 'flex-grow my-1',
      label: 'Invite code',
      labelVisuallyHidden: true,
      placeholder: 'Paste invite code',
      value: invitationCodeValue,
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
              <Button
                onClick={() =>
                  navigator.clipboard.writeText(
                    partyInvitations[0].descriptor.encode().toString()
                  )
                }
              >
                Copy invite code
              </Button>
            )}
            <Button onClick={() => setParty(undefined)}>Exit space</Button>
          </div>
        </>
      ) : (
        <Group
          className='my-8 mx-auto w-72'
          label={{
            level: 1,
            className: 'text-xl text-center mb-3',
            children: 'Create or join a space'
          }}
        >
          <Button
            variant='primary'
            className='w-full'
            onClick={onCreate}
            {...(loading && { disabled: true })}
          >
            Create
          </Button>
          <p className='text-center'>or</p>
          <div role='none' className='flex items-center gap-2'>
            <Input {...inviteCodeInputProps} />
            <Button
              variant='primary'
              onClick={onJoin}
              {...(loading && { disabled: true })}
            >
              Join
            </Button>
          </div>
        </Group>
      )}
    </PartyContext.Provider>
  );
};

export const useParty = () => useContext(PartyContext);
