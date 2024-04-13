//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { Button, Input, Toolbar } from '@dxos/react-ui';

// TODO(burdon): Goal:
//  Establish P2P connection using cloudflare STUN server.

const CHANNEL_LABEL = 'data-channel';

class Connection {
  private connection?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private makingOffer?: boolean;

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

  async open({ sdp }: { sdp?: string }): Promise<string | undefined> {
    await this.close();
    log.info('opening...', { sdp });

    // TODO(burdon): Offer/Answer over https.
    // https://developers.cloudflare.com/calls/https-api/

    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
    // https://github.com/cloudflare/workers-sdk/blob/main/templates/stream/webrtc/src/WHIPClient.ts
    this.connection = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.cloudflare.com:3478',
        },
      ],
    });

    this.connection.addEventListener('connectionstatechange', async (event) => {
      log.info('connectionstatechange', { event });
    });

    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#signaling_transaction_flow
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#implementing_perfect_negotiation
    this.connection.addEventListener('negotiationneeded', async (event) => {
      log.info('negotiationneeded', { event });

      try {
        this.makingOffer = true;
        await this.connection!.setLocalDescription();
        const message = encodeURI(JSON.stringify(this.connection!.localDescription!.toJSON()));
        log.info('making offer', { message });
        void navigator.clipboard.writeText(message);
      } catch (err) {
        log.catch(err);
      } finally {
        this.makingOffer = false;
      }

      // invariant(sdp);
      // await this.connection!.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: decodeURI(sdp!) }));
      // const answer = await this.connection!.createAnswer();
      // await this.connection!.setLocalDescription(answer);
    });

    this.connection.addEventListener('icecandidate', async (event) => {
      log.info('icecandidate', { event });
      // TODO(burdon): Send ice candidate.
    });

    this.connection.addEventListener('icecandidateerror', async (event) => {
      log.info('icecandidateerror', { event });
    });

    this.connection.addEventListener('iceconnectionstatechange', async (event) => {
      log.info('iceconnectionstatechange', { event });
      this.connection?.restartIce();
    });

    this.connection.addEventListener('datachannel', async (event) => {
      log.info('datachannel', { event });
    });

    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
    if (!sdp) {
      // const offer = await this.connection.createOffer();
      // await this.connection.setLocalDescription(offer);
      // log.info('offer', { offer });
      log.info('creating channel...');
      this.channel = this.connection.createDataChannel(CHANNEL_LABEL, { negotiated: true, id: 0 });
      this.channel.addEventListener('open', () => {
        log.info('channel open');
      });
      // return encodeURI(offer.sdp!);
    } else {
      log.info('listening...');
      await this.connection.setRemoteDescription({ type: 'offer', sdp: decodeURI(sdp!) });
      await this.connection.setLocalDescription();

      // this.channel = this.connection.createDataChannel(CHANNEL_LABEL, { negotiated: true, id: 0 });
      // this.channel.addEventListener('open', () => {
      //   log.info('channel open');
      // });

      // await this.connection!.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: decodeURI(sdp!) }));
      // await this.connection!.setRemoteDescription({ type: 'offer', sdp: decodeURI(sdp!) });
      // const answer = await this.connection!.createAnswer();
      // await this.connection!.setLocalDescription(answer);
    }

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

  // async postMessage(data: string) {
  //   return await fetch(this.endpoint, {
  //     method: 'POST',
  //     mode: 'cors',
  //     headers: {
  //       'content-type': 'application/sdp',
  //     },
  //     body: data,
  //   });
  // }
}

// const waitToCompleteICEGathering = async (peerConnection: RTCPeerConnection, timeout = 1000) =>
//   new Promise<RTCSessionDescription | null>((resolve) => {
//     // Wait at most 1 second for ICE gathering.
//     setTimeout(() => {
//       resolve(peerConnection.localDescription);
//     }, timeout);
//
//     peerConnection.onicegatheringstatechange = (ev) =>
//       peerConnection.iceGatheringState === 'complete' && resolve(peerConnection.localDescription);
//   });

export const Connector = () => {
  const [, forceUpdate] = useState({});
  const [connection, setConnection] = useState<Connection>();
  const [sdp, setSdp] = useState<string>();
  useEffect(() => {
    setConnection(new Connection('/data/x-1234'));
  }, []);

  const handleConnect = ({ sdp }: { sdp?: string } = {}) => {
    setTimeout(async () => {
      const s = await connection!.open({ sdp });
      // if (s) {
      //   void navigator.clipboard.writeText(s);
      // }

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
        <Button onClick={() => handleConnect()}>Offer</Button>
        <Button onClick={() => handleConnect({ sdp })}>Listen</Button>
        <Button onClick={() => handleClose()}>Close</Button>
        <Button onClick={() => forceUpdate({})}>Refresh</Button>
      </Toolbar.Root>
      <Input.Root>
        <Input.TextInput placeholder='SDP' value={sdp ?? ''} onChange={(event) => setSdp(event.target.value)} />
      </Input.Root>
      <div className='flex flex-col grow overflow-hidden p-2'>
        <div className='flex flex-col overflow-y-scroll'>
          <pre className='text-sm'>{JSON.stringify(connection?.info ?? {}, undefined, 2)}</pre>
        </div>
      </div>
    </div>
  );
};
