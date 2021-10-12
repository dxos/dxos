//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { trigger } from '@dxos/async';
import { generatePasscode } from '@dxos/credentials';

import {
  ClientInitializer, decodeInvitation,
  encodeInvitation,
  ProfileInitializer,
  useClient,
  useParties
} from '../src';
import { PublicKey } from '@dxos/crypto';

export default {
  title: 'react-client/Invitations'
};

// debug.enable('dxos:*');

const Pre = ({ value }: { value: any }) => {
  return (
    <pre
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
      }}
    >
      {JSON.stringify(value, undefined, 2)}
    </pre>
  )
}

/**
 * Displays client info.
 */
const ClientPanel = () => {
  const client = useClient();
  const parties = useParties();

  // TODO(burdon): Refresh view via subscription?
  const info = {
    config: client.config,
    echo: client.echo.info(),
    halo: client.halo.info(),
    parties: parties.map(({ key }) => key.toHex())
  }

  return (
    <div style={{ padding: 8, borderBottom: '1px solid #CCC' }}>
      <Pre value={info} />
    </div>
  );
};

// TODO(burdon): Factor out.
const useSecretProvider = (): [() => Promise<Buffer>, string | undefined, () => void] => {
  const [pin, setPin] = useState<string>();

  const provider = () => {
    const pin = generatePasscode();
    setPin(pin);
    return Promise.resolve(Buffer.from(pin));
  }

  return [provider, pin, () => setPin('')];
}

/**
 * Creates party and invitations.
 */
const InviatationPanel = () => {
  const client = useClient();
  const [partyKey, setPartyKey] = useState<PublicKey>();
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretProvider();

  const handleCreateParty = () => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      setPartyKey(party.key);
      setInvitationCode('');
      resetPin();
    });
  }

  const handleCreateInvitation = () => {
    setImmediate(async () => {
      const invitation = await client.createInvitation(partyKey!, secretProvider);
      setInvitationCode(encodeInvitation(invitation));
    });
  }

  return (
    <div style={{ padding: 8, borderBottom: '1px solid #CCC' }}>
      <div style={{ display: 'flex' }}>
        <button
          onClick={handleCreateParty}
        >
          Create Party
        </button>
        <div style={{ margin: 2 }}/>
        <button
          disabled={!partyKey}
          onClick={handleCreateInvitation}
        >
          Create Invitation
        </button>
      </div>
      {invitationCode && (
        <div style={{ display: 'flex', marginTop: 8 }}>
          <textarea
            style={{ width: '100%' }}
            disabled
            defaultValue={invitationCode}
            rows={6}
          />
        </div>
      )}
      {pin && (
        <div style={{ marginTop: 8 }}>
          <input
            disabled
            type='text'
            value={pin}
          />
        </div>
      )}
    </div>
  );
};

// TODO(burdon): Factor out.
const useProvider = <T extends any> (): [() => Promise<T>, (value: T) => void] => {
  const [[provider, resolver]] = useState(() => trigger<T>());

  return [provider, resolver];
}

/**
 * Processes party invitations.
 */
const RedeemInvitationContainer = () => {
  const client = useClient();
  const [status, setStatus] = useState({});
  const [secretProvider, secretResolver] = useProvider<Buffer>();

  // TODO(burdon): Second time submit fails; Test trigger used multiple times?
  const handleSubmit = async (invitationCode: string) => {
    setStatus({});

    try {
      // TODO(burdon): Expose state machine for invitations.
      //   const invitationProcess = client.joinParty(invitation);
      //   invitationProcess.authenticate(code);
      //   const party = await invitationProcess.ready
      //   const { status } = useInvitationStatus(invitationProcess)
      //   const party = await client.joinParty(invitation)..ready;

      const invitation = decodeInvitation(invitationCode);
      const party = await client.echo.joinParty(invitation, secretProvider);
      await party.open();

      setStatus({ party: party.key.toHex() });
    } catch (error) {
      setStatus({ error });
    }
  };

  const handleAuthenticate = (pin: string) => {
    secretResolver(Buffer.from(pin));
  }

  return (
    <RedeemInvitationPanel
      status={status}
      onSubmit={handleSubmit}
      onAuthenticate={handleAuthenticate}
    />
  )
}

const RedeemInvitationPanel = (
  {
    status,
    onSubmit,
    onAuthenticate
  }: {
    status: any, // TODO(burdon): Define type.
    onSubmit: (invitationCode: string) => void
    onAuthenticate: (pin: string) => void
  }
) => {
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [pin, setPin] = useState<string>('');

  return (
    <div style={{ padding: 8, borderBottom: '1px solid #CCC' }}>
      <div>
        <div style={{ display: 'flex', marginBottom: 8 }}>
          <textarea
            style={{ width: '100%' }}
            value={invitationCode}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
              setInvitationCode(event.target.value);
              setPin('');
            }}
            rows={6}
          />
        </div>
        <div style={{ display: 'flex' }}>
          <button
            onClick={() => onSubmit(invitationCode)}
            disabled={!invitationCode}
          >
            Join Party
          </button>
          <div style={{ margin: 2 }}/>
          <input
            type='text'
            value={pin}
            placeholder='PIN'
            disabled={!invitationCode}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPin(event.target.value)}
          />
          <div style={{ margin: 2 }}/>
          <button
            disabled={!pin}
            onClick={() => onAuthenticate(pin)}
          >
            Authenticate
          </button>
        </div>
      </div>
      {(Object.keys(status).length > 0) && (
        <div>
          <h2>Status</h2>
          <Pre value={status} />
        </div>
      )}
    </div>
  );
}

const TestApp = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      flexShrink: 0,
      overflow: 'hidden'
    }}>
      <div style={{
        border: '1px solid #CCC',
        borderBottom: 'none',
        margin: 16
      }}>
        <ClientPanel/>
        <InviatationPanel/>
        <RedeemInvitationContainer/>
      </div>
    </div>
  );
};

export const TwinClients = () => {
  // Configure in-memory swarm.
  const config = { swarm: { signal: undefined } };

  // TODO(burdon): Remove ProfileInitializer.

  return (
    <div style={{
      display: 'flex',
      overflow: 'hidden'
    }}>
      <ClientInitializer config={config}>
        <ProfileInitializer>
          <TestApp/>
        </ProfileInitializer>
      </ClientInitializer>
      <ClientInitializer config={config}>
        <ProfileInitializer>
          <TestApp/>
        </ProfileInitializer>
      </ClientInitializer>
    </div>
  );
}
