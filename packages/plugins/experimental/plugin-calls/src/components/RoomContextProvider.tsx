//
// Copyright 2024 DXOS.org
//

import React, { useState, useMemo, type ReactNode, useEffect } from 'react';

import { type PublicKey } from '@dxos/react-client';

import {
  useCallsConnection,
  usePromise,
  useRoom,
  useStablePojo,
  useUserMedia,
  RoomContext,
  type RoomContextType,
} from './hooks';
import {} from './hooks';
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
    <Room roomId={roomId!} {...roomData} username={username}>
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
  const { client, iceConnectionState } = useCallsConnection({
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
  const pushedVideoTrackPromise = useMemo(
    () => client?.pushTrack(userMedia.videoPromise, videoEncodingParams),
    [client, userMedia.videoPromise, videoEncodingParams],
  );

  const pushedVideoTrack = usePromise(pushedVideoTrackPromise);

  const pushedAudioTrackPromise = useMemo(
    () =>
      client?.pushTrack(userMedia.publicAudioTrackPromise, [
        {
          networkPriority: 'high',
        },
      ] satisfies RTCRtpEncodingParameters[]),
    [client, userMedia.publicAudioTrackPromise],
  );
  const pushedAudioTrack = usePromise(pushedAudioTrackPromise);

  const context: RoomContextType = {
    joined,
    setJoined,
    dataSaverMode,
    setDataSaverMode,
    // traceLink,
    userMedia,
    userDirectoryUrl: undefined,
    client,
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
