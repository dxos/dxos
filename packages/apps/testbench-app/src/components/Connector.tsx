//
// Copyright 2024 DXOS.org
//

import { useBaselimeRum } from '@baselime/react-rum';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { Button, Input, Toolbar } from '@dxos/react-ui';

import { Peer } from '../webrtc/client';

/**
 * Experimental mechanism to establish WebRTC connection between peers.
 */
export const Connector = () => {
  const { setUser, sendEvent } = useBaselimeRum();
  const [, forceUpdate] = useState({});
  const [peer, setPeer] = useState<Peer>();
  const [state, setState] = useState<string>();
  const [invitation, setInvitation] = useState<string>();
  useEffect(() => {
    const peer = new Peer(PublicKey.random());
    setUser(peer.id.toHex());
    const unsubscribe = peer.update.on(({ state }) => {
      setState(state);
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
      sendEvent('connection.connect', { invitation: invitation_ });
    } else if (!invitation_) {
      return;
    }

    setTimeout(async () => {
      sendEvent('connection.open');
      await peer!.open(invitation_, initiate);
      forceUpdate({});
    });
  };

  const handleClose = () => {
    setTimeout(async () => {
      sendEvent('connection.close');
      await peer!.close();
      forceUpdate({});
    });
  };

  const handlePing = () => {
    peer?.send({ action: 'ping' });
    forceUpdate({});
    sendEvent('connection.ping');
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
        <div className='w-[100px] flex shrink-0 items-center font-mono'>{state}</div>
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
