//
// Copyright 2024 DXOS.org
//

import React, { useState, useMemo, type ReactNode, useEffect } from 'react';
import { of } from 'rxjs';

import { type PublicKey } from '@dxos/react-client';

import { useStateObservable, useSubscribedState } from './hooks/rxjsHooks';
import { usePeerConnection } from './hooks/usePeerConnection';
import { useRoom } from './hooks/useRoom';
import { RoomContext, type RoomContextType } from './hooks/useRoomContext';
import { useStablePojo } from './hooks/useStablePojo';
import useUserMedia from './hooks/useUserMedia';
import { CALLS_URL } from '../types';

// Types for loader function response
interface RoomData {
  iceServers: RTCIceServer[];
  feedbackEnabled: boolean;
  maxWebcamFramerate: number;
  maxWebcamBitrate: number;
  maxWebcamQualityLevel: number;
}

interface RoomProps extends RoomData {
  username: string;
  roomId: PublicKey;
  children: ReactNode;
}

export const RoomContextProvider = ({
  username,
  roomId,
  iceServers,
  children,
}: {
  username: string;
  roomId: PublicKey;
  iceServers: RTCIceServer[];
  children: ReactNode;
}): JSX.Element => {
  const [roomData, setRoomData] = useState<RoomData | null>(null);

  // Simulate Remix loader behavior with useEffect
  useEffect(() => {
    setRoomData({
      iceServers,
      feedbackEnabled: true,
      maxWebcamFramerate: 24,
      maxWebcamBitrate: 1200000,
      maxWebcamQualityLevel: 1080,
    });
  }, []);

  if (!roomData) {
    return <div>Loading...</div>;
  }

  return (
    <Room roomId={roomId!} {...roomData} username={username} maxWebcamQualityLevel={720} maxWebcamFramerate={30}>
      {children}
    </Room>
  );
};

const Room = ({
  username,
  roomId,
  iceServers,
  maxWebcamBitrate,
  maxWebcamFramerate,
  maxWebcamQualityLevel,
  children,
}: RoomProps): JSX.Element => {
  const [joined, setJoined] = useState(false);
  const [dataSaverMode, setDataSaverMode] = useState(false);

  const userMedia = useUserMedia();
  const room = useRoom({ roomId, username });
  const { peer, iceConnectionState } = usePeerConnection({
    // apiExtraParams,
    iceServers,
    apiBase: `${CALLS_URL}/api/calls`,
  });

  const scaleResolutionDownBy = useMemo(() => {
    const videoStreamTrack = userMedia.videoStreamTrack;
    const { height, width } = tryToGetDimensions(videoStreamTrack);
    // we need to do this in case camera is in portrait mode
    const smallestDimension = Math.min(height, width);
    return Math.max(smallestDimension / maxWebcamQualityLevel, 1);
  }, [maxWebcamQualityLevel, userMedia.videoStreamTrack]);

  const videoEncodingParams = useStablePojo<RTCRtpEncodingParameters[]>([
    {
      maxFramerate: maxWebcamFramerate,
      maxBitrate: maxWebcamBitrate,
      scaleResolutionDownBy,
    },
  ]);
  const videoTrackEncodingParams$ = useStateObservable<RTCRtpEncodingParameters[]>(videoEncodingParams);
  const pushedVideoTrack$ = useMemo(
    () => peer.pushTrack(userMedia.videoTrack$, videoTrackEncodingParams$),
    [peer, userMedia.videoTrack$, videoTrackEncodingParams$],
  );

  const pushedVideoTrack = useSubscribedState(pushedVideoTrack$);

  const pushedAudioTrack$ = useMemo(
    () =>
      peer.pushTrack(
        userMedia.publicAudioTrack$,
        of<RTCRtpEncodingParameters[]>([
          {
            networkPriority: 'high',
          },
        ]),
      ),
    [peer, userMedia.publicAudioTrack$],
  );
  const pushedAudioTrack = useSubscribedState(pushedAudioTrack$);

  const context: RoomContextType = {
    joined,
    setJoined,
    dataSaverMode,
    setDataSaverMode,
    // traceLink,
    userMedia,
    userDirectoryUrl: undefined,
    peer,
    iceConnectionState,
    room,
    pushedTracks: {
      video: trackObjectToString(pushedVideoTrack),
      audio: trackObjectToString(pushedAudioTrack),
    },
  };

  return <RoomContext.Provider value={context}>{children}</RoomContext.Provider>;
};

const trackObjectToString = (trackObject?: any): string | undefined => {
  if (!trackObject) {
    return undefined;
  }
  return trackObject.sessionId + '/' + trackObject.trackName;
};

const tryToGetDimensions = (videoStreamTrack?: MediaStreamTrack): { height: number; width: number } => {
  if (!videoStreamTrack || !videoStreamTrack.getCapabilities) {
    return { height: 0, width: 0 };
  }
  const height = videoStreamTrack.getCapabilities().height?.max ?? 0;
  const width = videoStreamTrack.getCapabilities().width?.max ?? 0;
  return { height, width };
};
