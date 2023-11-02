//
// Copyright 2023 DXOS.org
//

import { VideoCamera, VideoCameraSlash } from '@phosphor-icons/react';
import React, { FC, useRef, useState } from 'react';
import Peer from 'simple-peer';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { useAsyncEffect } from '@dxos/react-async';
import { PublicKey, useConfig } from '@dxos/react-client';
import { Space, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ComplexMap } from '@dxos/util';

// https://www.npmjs.com/package/simple-peer#api
// https://www.npmjs.com/package/simple-peer#videovoice
// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling/webrtc_-_signaling_diagram.svg

const getChannel = ({ sender, receiver }: { sender: PublicKey; receiver: PublicKey }) =>
  `dxos.module.frame.video/channel/${sender.toHex()}/${receiver.toHex()}}`;

export const Video: FC<{ space: Space }> = ({ space }) => {
  const config = useConfig();
  const identity = useIdentity();
  const members = useMembers(space.key);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const [_, render] = useState({});
  invariant(identity);

  const iceServers: RTCIceServer[] = (config.values.runtime?.services?.ice as RTCIceServer[]) ?? [];
  // TODO(mykola): Merge initiatorPeerRefs and listenerPeerRefs into one map to use N webRTC connections instead of 2N.
  const initiatorPeerRefs = useRef<ComplexMap<PublicKey, any>>(new ComplexMap<PublicKey, any>(PublicKey.hash));
  const listenerPeerRefs = useRef<ComplexMap<PublicKey, any>>(new ComplexMap<PublicKey, any>(PublicKey.hash));

  useAsyncEffect(async () => {
    const ctx = new Context();
    members.forEach((member) => {
      if (member.identity.identityKey.equals(identity.identityKey)) {
        // Skip self.
        return;
      }

      const unsubscribe = space.listen(
        getChannel({ sender: member.identity.identityKey, receiver: identity.identityKey }),
        async (message: any) => {
          const { payload } = message;
          switch (payload.command) {
            case 'connect': {
              if (listenerPeerRefs.current.has(member.identity.identityKey)) {
                return;
              }

              const peer = new Peer({ config: { iceServers }, initiator: false });
              listenerPeerRefs.current.set(member.identity.identityKey, peer);
              peer.on('signal', (data) => {
                void space.postMessage(
                  getChannel({ sender: identity.identityKey, receiver: member.identity.identityKey }),
                  { command: 'signal', data, initiator: false },
                );
              });
              peer.on('stream', (stream) => {
                // TODO(burdon): Support multiple streams.
                remoteVideoRef.current!.srcObject = stream;
                render({});
              });

              const cleanup = (err?: Error) => {
                peer.destroy();
                listenerPeerRefs.current.delete(member.identity.identityKey);
                remoteVideoRef.current!.srcObject = null;
                render({});
                if (err) {
                  throw err;
                }
              };
              peer.on('error', cleanup);
              peer.on('close', cleanup);
              ctx.onDispose(cleanup);

              break;
            }

            case 'signal': {
              const { data } = payload;
              if (!payload || !payload.initiator) {
                return;
              }
              listenerPeerRefs.current.get(member.identity.identityKey).signal(data);
              break;
            }
          }
        },
      );
      ctx.onDispose(() => unsubscribe());
    });

    return () => {
      void ctx.dispose();
      listenerPeerRefs.current.clear();
    };
  }, [members.length]);

  const ctx = useRef<Context>();
  const handleStart = async () => {
    if (ctx.current && !ctx.current.disposed) {
      return;
    }
    ctx.current = new Context();
    // Get video stream.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    localVideoRef.current!.srcObject = stream;
    render({});
    members.forEach(async (member) => {
      if (member.identity.identityKey.equals(identity.identityKey)) {
        // Skip self.
        return;
      }

      // Create initiator peer.
      const peer = new Peer({ stream, config: { iceServers }, initiator: true });
      initiatorPeerRefs.current.set(member.identity.identityKey, peer);

      // Relay signal data.
      const unsubscribe = space.listen(
        getChannel({ sender: member.identity.identityKey, receiver: identity.identityKey }),
        (message: any) => {
          const { payload } = message;
          if (!payload || payload.initiator || payload.command !== 'signal') {
            return;
          }
          const { data } = payload;
          peer.signal(data);
        },
      );

      peer.on('signal', async (data) => {
        await space.postMessage(getChannel({ sender: identity.identityKey, receiver: member.identity.identityKey }), {
          command: 'signal',
          data,
          initiator: true,
        });
      });

      // Initiate connection.
      await space.postMessage(getChannel({ sender: identity.identityKey, receiver: member.identity.identityKey }), {
        command: 'connect',
      });

      const cleanup = (err?: Error) => {
        unsubscribe();
        peer.destroy();
        initiatorPeerRefs.current.delete(member.identity.identityKey);
        localVideoRef.current!.srcObject = null;
        render({});
        if (err) {
          throw err;
        }
      };

      peer.on('error', cleanup);
      peer.on('close', cleanup);
      ctx.current!.onDispose(cleanup);
    });
  };

  const handleStop = () => {
    void ctx.current?.dispose();
    initiatorPeerRefs.current.clear();
  };

  return (
    <div className='flex flex-col bg-zinc-300'>
      <div className='flex mx-3 justify-end'>
        {localVideoRef.current && localVideoRef.current!.srcObject && (
          <Button classNames='p-1' variant='ghost' onClick={handleStop}>
            <VideoCameraSlash className={getSize(6)} />
          </Button>
        )}
        {localVideoRef.current && !localVideoRef.current!.srcObject && (
          <Button classNames='p-1' variant='ghost' onClick={handleStart}>
            <VideoCamera className={getSize(6)} />
          </Button>
        )}
      </div>
      <div className='flex flex-col bg-zinc-400'>
        <div className={mx('flex flex-col invisible', localVideoRef.current?.srcObject ? 'visible' : 'h-0')}>
          <video ref={localVideoRef} autoPlay={true} muted={true} />
        </div>
        <div className={mx('flex flex-col invisible', remoteVideoRef.current?.srcObject ? 'visible' : 'h-0')}>
          <video ref={remoteVideoRef} autoPlay={true} muted={true} />
        </div>
      </div>
    </div>
  );
};
