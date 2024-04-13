//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { Button, Toolbar } from '@dxos/react-ui';

// TODO(burdon): Goal:
//  Establish P2P connection using cloudflare STUN server.

const CHANNEL_LABEL = 'data-channel';

class Connection {
  private connection?: RTCPeerConnection;
  private channel?: RTCDataChannel;

  constructor(private readonly endpoint: string) {}

  get info() {
    return {
      ts: Date.now(),
      config: this.connection?.getConfiguration(),
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
      connection: this.connection && {
        connectionState: this.connection.connectionState,
        currentLocalDescription: this.connection.currentLocalDescription,
        currentRemoteDescription: this.connection.currentRemoteDescription,
        iceConnectionState: this.connection.iceConnectionState,
        iceGatheringState: this.connection.iceGatheringState,
        localDescription: this.connection.localDescription,
        remoteDescription: this.connection.remoteDescription,
        signalingState: this.connection.signalingState,
      },
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
      channel: this.channel && {
        binaryType: this.channel.binaryType,
        bufferedAmount: this.channel.bufferedAmount,
        id: this.channel.id,
        label: this.channel.label,
        maxPacketLifeTime: this.channel.maxPacketLifeTime,
        maxRetransmits: this.channel.maxRetransmits,
        negotiated: this.channel.negotiated,
        ordered: this.channel.ordered,
        protocol: this.channel.protocol,
        readyState: this.channel.readyState,
      },
    };
  }

  async open() {
    await this.close();
    log.info('opening...');

    // https://github.com/cloudflare/workers-sdk/blob/main/templates/stream/webrtc/src/WHIPClient.ts
    this.connection = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.cloudflare.com:3478',
        },
      ],
    });

    this.connection.addEventListener('negotiationneeded', async (event) => {
      log.info('negotiationneeded', { event });
    });

    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);
    log.info('offer', { offer });

    // {
    //   const offer = await waitToCompleteICEGathering(this.connection);
    //   log.info('offer', { offer });
    //
    //   if (offer) {
    //     while (this.connection && this.connection.connectionState !== 'closed') {
    //       log.info('polling...');
    //       const response = await this.postMessage(offer.sdp);
    //       console.log(response);
    //       await sleep(1000);
    //     }
    //   }
    // }

    // const channel = connection.createDataChannel(CHANNEL_LABEL);
    // setConnection({ connection, channel });
    // channel.addEventListener('open', () => {
    //   log.info('channel open');
    // });
  }

  async close() {
    if (this.connection) {
      log.info('closing...');
      this.channel?.close();
      this.connection?.close();
      this.channel = undefined;
      this.connection = undefined;
    }
  }

  async postMessage(data: string) {
    return await fetch(this.endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'content-type': 'application/sdp',
      },
      body: data,
    });
  }
}

const waitToCompleteICEGathering = async (peerConnection: RTCPeerConnection, timeout = 1000) =>
  new Promise<RTCSessionDescription | null>((resolve) => {
    // Wait at most 1 second for ICE gathering.
    setTimeout(() => {
      resolve(peerConnection.localDescription);
    }, timeout);

    peerConnection.onicegatheringstatechange = (ev) =>
      peerConnection.iceGatheringState === 'complete' && resolve(peerConnection.localDescription);
  });

export const Connector = () => {
  const [, forceUpdate] = useState({});
  const [connection, setConnection] = useState<Connection>();
  useEffect(() => {
    setConnection(new Connection('/data/x-1234'));
  }, []);

  const handleConnect = () => {
    setTimeout(async () => {
      await connection!.open();
      forceUpdate({});
    });
  };

  const handleClose = () => {
    setTimeout(async () => {
      await connection!.close();
      forceUpdate({});
    });
  };

  return (
    <div className='fixed inset-0 flex flex-col overflow-hidden'>
      <Toolbar.Root>
        <Button onClick={() => handleConnect()}>Connect</Button>
        <Button onClick={() => handleClose()}>Close</Button>
        <Button onClick={() => forceUpdate({})}>Refresh</Button>
      </Toolbar.Root>
      <div className='flex flex-col grow overflow-hidden p-2'>
        <div className='flex flex-col overflow-y-scroll'>
          <pre className='text-sm'>{JSON.stringify(connection?.info ?? {}, undefined, 2)}</pre>
        </div>
      </div>
    </div>
  );
};
