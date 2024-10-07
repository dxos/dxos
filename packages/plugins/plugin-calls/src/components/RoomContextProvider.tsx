//
// Copyright 2024 DXOS.org
//

import React, { useState, useMemo, type ReactNode, useEffect } from 'react';
import { from, of, switchMap } from 'rxjs';

import { useConfig } from '@dxos/react-client';

import { EnsureOnline } from '../app/components/EnsureOnline';
import { EnsurePermissions } from '../app/components/EnsurePermissions';
import { useStateObservable, useSubscribedState } from '../app/hooks/rxjsHooks';
import { usePeerConnection } from '../app/hooks/usePeerConnection';
import useRoom from '../app/hooks/useRoom';
import { RoomContext, type RoomContextType } from '../app/hooks/useRoomContext';
import { useRoomHistory } from '../app/hooks/useRoomHistory';
import { useStablePojo } from '../app/hooks/useStablePojo';
import useUserMedia from '../app/hooks/useUserMedia';
import { type Mode } from '../app/utils/mode';

// Types for loader function response
interface RoomData {
  mode: Mode;
  iceServers: RTCIceServer[];
  feedbackEnabled: boolean;
  maxWebcamFramerate: number;
  maxWebcamBitrate: number;
  maxWebcamQualityLevel: number;
  maxApiHistory: number;
}

interface RoomProps extends RoomData {
  roomName: string;
  children: ReactNode;
}

export const RoomContextProvider = ({ roomName, children }: { roomName: string; children: ReactNode }): JSX.Element => {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const config = useConfig();

  // Simulate Remix loader behavior with useEffect
  useEffect(() => {
    setRoomData({
      mode: 'development',
      iceServers: config.get('runtime.services.ice') ?? [],
      feedbackEnabled: true,
      maxWebcamFramerate: 24,
      maxWebcamBitrate: 1200000,
      maxWebcamQualityLevel: 1080,
      maxApiHistory: 100,
    });
  }, []);

  if (!roomData) {
    return <div>Loading...</div>;
  }

  return (
    <EnsurePermissions>
      <EnsureOnline>
        <Room roomName={roomName!} {...roomData}>
          {children}
        </Room>
      </EnsureOnline>
    </EnsurePermissions>
  );
};

const Room = ({
  roomName,
  mode,
  iceServers,
  maxWebcamBitrate,
  maxWebcamFramerate,
  maxWebcamQualityLevel,
  maxApiHistory,
  children,
}: RoomProps): JSX.Element => {
  const [joined, setJoined] = useState(false);
  const [dataSaverMode, setDataSaverMode] = useState(false);

  const userMedia = useUserMedia(mode);
  const room = useRoom({ roomName, userMedia });
  const { peer, iceConnectionState } = usePeerConnection({
    maxApiHistory,
    // apiExtraParams,
    iceServers,
    apiBase: 'https://calls.dxos.workers.dev/api/calls',
  });
  const roomHistory = useRoomHistory(peer, room);

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

  const pushedScreenSharingTrack$ = useMemo(() => {
    return userMedia.screenShareVideoTrack$.pipe(
      switchMap((track) => (track ? from(peer.pushTrack(of(track))) : of(undefined))),
    );
  }, [peer, userMedia.screenShareVideoTrack$]);
  const pushedScreenSharingTrack = useSubscribedState(pushedScreenSharingTrack$);

  const context: RoomContextType = {
    joined,
    setJoined,
    dataSaverMode,
    setDataSaverMode,
    // traceLink,
    userMedia,
    userDirectoryUrl: undefined,
    peer,
    roomHistory,
    iceConnectionState,
    room,
    pushedTracks: {
      video: trackObjectToString(pushedVideoTrack),
      audio: trackObjectToString(pushedAudioTrack),
      screenshare: trackObjectToString(pushedScreenSharingTrack),
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
