//
// Copyright 2024 DXOS.org
//

import PartySocket from 'partysocket';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Button, Input, Toolbar } from '@dxos/react-ui';

// TODO(burdon): Goal:
//  Establish P2P connection using cloudflare STUN server.

const CHANNEL_LABEL = 'data-channel';

class Connection {
  private readonly id = `client-${PublicKey.random().toHex().slice(0, 4)}`;

  private peer?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private signaling?: PartySocket;
  private makingOffer?: boolean;

  get info() {
    return {
      ts: Date.now(),
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
      connection: this.peer && {
        connectionState: this.peer.connectionState,
        currentLocalDescription: this.peer.currentLocalDescription,
        currentRemoteDescription: this.peer.currentRemoteDescription,
        iceConnectionState: this.peer.iceConnectionState,
        iceGatheringState: this.peer.iceGatheringState,
        localDescription: this.peer.localDescription,
        remoteDescription: this.peer.remoteDescription,
        signalingState: this.peer.signalingState,
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
      config: this.peer?.getConfiguration(),
    };
  }

  async open(initiate = false) {
    await this.close();
    log.info('opening...', { initiate });

    // TODO(burdon): Offer/Answer over https.
    // https://developers.cloudflare.com/calls/https-api/

    // https://docs.partykit.io/reference/partysocket-api
    this.signaling = new PartySocket({
      host: 'http://127.0.0.1:1999',
      id: 'client-' + PublicKey.random().toHex().slice(0, 4),
      party: 'main', // Default party.
      room: 'signaling',
    });

    this.signaling.addEventListener('open', (event) => {
      log.info('signaling.open', { event });
    });

    this.signaling.addEventListener('message', async (event) => {
      const data = JSON.parse(event.data);
      log.info('signaling.message', { data });
      const { description, candidate } = data;

      if (description) {
        log.info('received', { type: description.type });
        await this.peer!.setRemoteDescription(
          new RTCSessionDescription({ type: description.type, sdp: description.sdp }),
        );

        if (description.type === 'offer') {
          await this.peer!.setLocalDescription();
          this.send({ description: this.peer?.localDescription?.toJSON() });
        }
      }

      if (candidate) {
        await this.peer!.addIceCandidate(candidate);
      }
    });

    this.signaling.reconnect();

    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#signaling_transaction_flow
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#implementing_perfect_negotiation
    this.peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.cloudflare.com:3478',
        },
      ],
    });

    this.peer.addEventListener('connectionstatechange', async (event) => {
      log.info('peer.connectionstatechange', { event });
    });

    this.peer.addEventListener('negotiationneeded', async (event) => {
      log.info('peer.negotiationneeded', { event });

      if (initiate) {
        try {
          log.info('making offer...');
          this.makingOffer = true;
          await this.peer!.setLocalDescription();
          this.send({ description: this.peer!.localDescription!.toJSON() });
          // void navigator.clipboard.writeText(message);
        } catch (err) {
          log.catch(err);
        } finally {
          this.makingOffer = false;
        }
      }
    });

    this.peer.addEventListener('icecandidate', async (event) => {
      log.info('peer.icecandidate', { event });
      if (event.candidate) {
        this.send({ candidate: event.candidate });
      }
    });

    this.peer.addEventListener('icecandidateerror', async (event) => {
      log.info('peer.icecandidateerror', { event });
    });

    this.peer.addEventListener('iceconnectionstatechange', async (event) => {
      log.info('peer.iceconnectionstatechange', { event });
      this.peer?.restartIce();
    });

    this.peer.addEventListener('datachannel', async (event) => {
      log.info('peer.datachannel', { event });
    });

    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
    log.info('creating channel...');
    this.channel = this.peer.createDataChannel(CHANNEL_LABEL, { negotiated: true, id: 0 });
    this.channel.addEventListener('open', () => {
      log.info('channel.open');
      this.channel?.send(JSON.stringify({ sender: this.id, message: 'hello' }));
    });
    this.channel.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      log.info('channel.message', { data });
    });
  }

  async close() {
    if (this.signaling) {
      this.signaling.close();
      this.signaling = undefined;
    }

    if (this.peer) {
      log.info('closing...');
      this.channel?.close();
      this.peer?.close();
      this.channel = undefined;
      this.peer = undefined;
    }
  }

  // TODO(burdon): Effect schema.
  send<T>(message: T) {
    log.info('send', { message });
    this.signaling?.send(JSON.stringify(message));
  }

  ping() {
    this.send({ command: 'ping' });
  }
}

export const Connector = () => {
  const [, forceUpdate] = useState({});
  const [connection, setConnection] = useState<Connection>();
  const [invitation, setInvitation] = useState<string>();
  useEffect(() => {
    setConnection(new Connection());
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
    connection?.ping();
  };

  return (
    <div className='fixed inset-0 flex flex-col overflow-hidden'>
      <Toolbar.Root classNames='p-2'>
        <Button onClick={() => handleConnect(true)}>Offer</Button>
        <Button onClick={() => handleConnect()}>Listen</Button>
        <Button onClick={() => handleClose()}>Close</Button>
        <Button onClick={() => handlePing()}>Ping</Button>
        <Button onClick={() => forceUpdate({})}>Refresh</Button>
      </Toolbar.Root>
      <div className='p-2'>
        <Input.Root>
          <Input.TextInput
            placeholder='Invitation'
            value={invitation ?? ''}
            onChange={(event) => setInvitation(event.target.value)}
          />
        </Input.Root>
      </div>
      <div className='flex flex-col grow overflow-hidden p-2'>
        <div className='flex flex-col overflow-y-scroll'>
          <pre className='text-sm'>{JSON.stringify(connection?.info ?? {}, undefined, 2)}</pre>
        </div>
      </div>
    </div>
  );
};
