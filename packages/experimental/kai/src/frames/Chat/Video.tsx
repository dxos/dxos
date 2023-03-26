//
// Copyright 2023 DXOS.org
//

import { VideoCamera, VideoCameraSlash } from '@phosphor-icons/react';
import assert from 'assert';
import React, { FC, useEffect, useRef } from 'react';
import Peer from 'simple-peer';

import { PublicKey, Space } from '@dxos/client';
import { useConfig, useIdentity, useMembers } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';

// https://www.npmjs.com/package/simple-peer#api
// https://www.npmjs.com/package/simple-peer#videovoice
// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling/webrtc_-_signaling_diagram.svg

const createChannel = (key: PublicKey) => `dxos.module.frame.video/channel/${key.toHex()}`;

export const Video: FC<{ space: Space }> = ({ space }) => {
  const config = useConfig();
  const identity = useIdentity();
  const members = useMembers(space.key);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  assert(identity);
  const localIdentityKey = identity.identityKey;
  const remoteIdentityKey =
    localIdentityKey &&
    members.find((member) => !member.identity.identityKey.equals(localIdentityKey))?.identity.identityKey;

  // TODO(burdon): Support multiple streams.
  const iceServers: RTCIceServer[] = (config.values.runtime?.services?.ice as RTCIceServer[]) ?? [];
  const initiatorPeerRef = useRef<any>();
  const listenerPeerRef = useRef<any>();

  useEffect(() => {
    if (!remoteIdentityKey) {
      return;
    }

    console.log('listening...', localIdentityKey.truncate());
    space.listen(createChannel(localIdentityKey), async (message: any) => {
      const { payload } = message;
      switch (payload.command) {
        case 'connect': {
          console.log('connecting...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
          const peer = new Peer({ stream, config: { iceServers } });
          peer.on('signal', (data) => {
            console.log('relay signal', data);
            void space.postMessage(createChannel(remoteIdentityKey), { command: 'signal', data });
          });
          // TODO(burdon): Stream never called.
          peer.on('stream', (stream) => {
            console.log('handle stream');
            remoteVideoRef.current!.srcObject = stream;
          });

          listenerPeerRef.current = peer;
          break;
        }

        case 'signal': {
          const { data } = payload;
          console.log('signal', data);
          listenerPeerRef.current?.signal(data);
          break;
        }
      }
    });

    return () => {
      console.log('stopping...');
      listenerPeerRef.current?.removeAllListeners('signal');
      listenerPeerRef.current?.removeAllListeners('stream');
      listenerPeerRef.current = undefined;
      remoteVideoRef.current!.srcObject = null;
    };
  }, [remoteIdentityKey]);

  const handleStart = async () => {
    if (!remoteIdentityKey) {
      return;
    }

    // Get video stream.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    localVideoRef.current!.srcObject = stream;

    // Create initiator peer.
    const peer = new Peer({ stream, config: { iceServers }, initiator: true });
    initiatorPeerRef.current = peer;
    // Relay signal data.
    peer.on('signal', (data) => {
      console.log('relay signal', data);
      void space.postMessage(createChannel(remoteIdentityKey), { command: 'signal', data });
    });

    // Send invitation.
    console.log('sending invitation...', remoteIdentityKey.truncate());
    await space.postMessage(createChannel(remoteIdentityKey), { command: 'connect' });
  };

  const handleStop = () => {
    console.log('stopping...');
    initiatorPeerRef.current?.removeAllListeners('signal');
    initiatorPeerRef.current = undefined;
    localVideoRef.current!.srcObject = null;
  };

  return (
    <div className='flex flex-col bg-zinc-300'>
      <div className='flex mx-3 justify-end'>
        {(initiatorPeerRef.current && (
          <Button className='p-1' variant='ghost' onClick={handleStop}>
            <VideoCameraSlash className={getSize(6)} />
          </Button>
        )) ||
          (remoteIdentityKey && (
            <Button className='p-1' variant='ghost' onClick={handleStart}>
              <VideoCamera className={getSize(6)} />
            </Button>
          ))}
      </div>
      <div className='flex flex-col'>
        <div className={mx('flex flex-col invisible', localVideoRef.current?.srcObject && 'visible border')}>
          <span>local</span>
          <video ref={localVideoRef} autoPlay={true} muted={true} />
        </div>
        <div className={mx('flex flex-col invisible', remoteVideoRef.current?.srcObject && 'visible border')}>
          <span>remote</span>
          <video ref={remoteVideoRef} autoPlay={true} muted={true} />
        </div>
      </div>
    </div>
  );
};
