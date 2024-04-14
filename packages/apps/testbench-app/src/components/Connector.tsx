//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { Button, Input, Toolbar } from '@dxos/react-ui';

import { Peer } from '../webrtc/client';

/**
 * Experimental mechanism to establish WebRTC connection between peers.
 */
export const Connector = () => {
  const [, forceUpdate] = useState({});
  const [peer, setPeer] = useState<Peer>();
  const [invitation, setInvitation] = useState<string>();
  useEffect(() => {
    const peer = new Peer(PublicKey.random());
    const unsubscribe = peer.update.on((event) => {
      forceUpdate({});
    });
    setPeer(peer);
    return () => unsubscribe();
  }, []);

  const handleConnect = (initiate = false) => {
    let invitation_ = invitation;
    if (initiate) {
      invitation_ = PublicKey.random().truncate();
      setInvitation(invitation_);
      void navigator.clipboard.writeText(invitation_);
    } else if (!invitation_) {
      return;
    }

    setTimeout(async () => {
      await peer!.open(invitation_, initiate);
      forceUpdate({});
    });
  };

  const handleClose = () => {
    setTimeout(async () => {
      await peer!.close();
      forceUpdate({});
    });
  };

  const handlePing = () => {
    peer?.send({ action: 'ping' });
    forceUpdate({});
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
          <pre className='text-xs'>{JSON.stringify(peer?.info ?? {}, undefined, 2)}</pre>
        </div>
      </div>
    </div>
  );
};
