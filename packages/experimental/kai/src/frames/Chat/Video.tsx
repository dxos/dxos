//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { useConfig } from '@dxos/react-client';

// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling/webrtc_-_signaling_diagram.svg

export const Video = () => {
  const config = useConfig();
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [connection, setConnection] = useState<RTCPeerConnection>();

  useEffect(() => {
    setTimeout(async () => {
      if (!connection) {
        // TODO(burdon): Reuse peer connections.
        const createPeerConnection = async () => {
          const iceServers: RTCIceServer[] = (config.values.runtime?.services?.ice as RTCIceServer[]) ?? [];

          // TODO(burdon): Get from wrtc.WebRTCTransport?
          const connection = new RTCPeerConnection({ iceServers });
          connection.ontrack = (event) => {
            console.log('ontrack');
            localVideoRef.current!.srcObject = event.streams[0];
          };

          return connection;
        };

        const connection = await createPeerConnection();
        setConnection(connection);

        // Send invitation.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        localVideoRef.current!.srcObject = stream;
        stream.getTracks().forEach((track) => connection.addTrack(track, stream));

        // TODO(burdon): handleNegotiationNeededEvent then:
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);

        // TODO(burdon): Connection to signaling server.
        // await webSocket.send(
        //   JSON.stringify({
        //     name: 'user-1',
        //     target: 'user-2',
        //     type: 'video-offer',
        //     sdp: connection.localDescription
        //   })
        // );

        // TODO(burdon): handleVideoAnswerMsg then:
      }
    });
  }, [config, localVideoRef, remoteVideoRef]);

  return (
    <div className='flex flex-col bg-zinc-300'>
      {/* <div className='flex'> */}
      {/*  <video ref={remoteVideoRef} /> */}
      {/* </div> */}
      <div className='flex'>
        <video ref={localVideoRef} autoPlay={true} muted={true} />
      </div>
    </div>
  );
};
