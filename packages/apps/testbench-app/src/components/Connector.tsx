//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { Button, Input, Toolbar } from '@dxos/react-ui';

import { Peer } from '../webrtc/client';

// TODO(burdon): Goal:
//  Establish P2P connection using cloudflare STUN server.

// void navigator.clipboard.writeText(message);

export const Connector = () => {
  const [, forceUpdate] = useState({});
  const [connection, setConnection] = useState<Peer>();
  const [invitation, setInvitation] = useState<string>();
  useEffect(() => {
    setConnection(new Peer(PublicKey.random()));
  }, []);

  const handleConnect = (initiate = false) => {
    setTimeout(async () => {
      await connection!.open(initiate);
      forceUpdate({});
    });
  };

  const handleClose = () => {
    setTimeout(async () => {
      await connection!.close();
      forceUpdate({});
    });
  };

  const handlePing = () => {
    connection?.send({ action: 'ping' });
  };

  return (
    <div className='fixed inset-0 flex flex-col overflow-hidden'>
      <Toolbar.Root classNames='p-2'>
        <Button onClick={() => handleConnect(true)}>Offer</Button>
        <Button onClick={() => handleConnect()}>Listen</Button>
        <Button onClick={() => handleClose()}>Close</Button>
        <Button onClick={() => handlePing()}>Ping</Button>
        <Input.Root>
          <Input.TextInput
            placeholder='Invitation'
            value={invitation ?? ''}
            onChange={(event) => setInvitation(event.target.value)}
          />
        </Input.Root>
        <Button onClick={() => forceUpdate({})}>Refresh</Button>
      </Toolbar.Root>
      <div className='flex flex-col grow overflow-hidden p-2'>
        <div className='flex flex-col overflow-y-scroll'>
          <pre className='text-xs'>{JSON.stringify(connection?.info ?? {}, undefined, 2)}</pre>
        </div>
      </div>
    </div>
  );
};
