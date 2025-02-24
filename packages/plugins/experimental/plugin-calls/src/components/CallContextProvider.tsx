//
// Copyright 2024 DXOS.org
//

import React, { useState, useMemo, type FC, type PropsWithChildren } from 'react';
import { from, of, switchMap } from 'rxjs';

import { useConfig } from '@dxos/react-client';

import {
  CallContext,
  useIsSpeaking,
  usePeerConnection,
  useCall,
  useStablePojo,
  useStateObservable,
  useSubscribedState,
  useUserMedia,
  type CallContextType,
} from '../hooks';
import { CALLS_URL } from '../types';

export type CallContextProviderProps = PropsWithChildren<Pick<CallContextType, 'roomId' | 'onTranscription'>>;

/**
 * Global context provider for calls.
 */
// TODO(burdon): Need to provide global state for plugin and provider.
// - First create simple plugin context that tracks the current roomId.
export const CallContextProvider: FC<CallContextProviderProps> = ({ children, roomId, onTranscription }) => {
  const config = useConfig();
  const iceServers = config.get('runtime.services.ice') ?? [];
  const maxWebcamFramerate = 24;
  const maxWebcamBitrate = 120_0000;
  const maxWebcamQualityLevel = 1_080;

  const room = useCall({ roomId });
  const userMedia = useUserMedia();
  const isSpeaking = useIsSpeaking(userMedia.audioTrack);
  const { peer, iceConnectionState } = usePeerConnection({
    iceServers,
    apiBase: `${CALLS_URL}/api/calls`,
  });

  const [joined, setJoined] = useState(false);
  const [dataSaverMode, setDataSaverMode] = useState(false);

  const scaleResolutionDownBy = useMemo(() => {
    const videoStreamTrack = userMedia.videoTrack;
    const { height, width } = tryToGetDimensions(videoStreamTrack);
    // We need to do this in case camera is in portrait mode.
    const smallestDimension = Math.min(height, width);
    return Math.max(smallestDimension / maxWebcamQualityLevel, 1);
  }, [maxWebcamQualityLevel, userMedia.videoTrack]);

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

  const pushedScreenshareTrack$ = useMemo(
    () =>
      userMedia.screenshareVideoTrack$.pipe(
        switchMap((track) => (track ? from(peer.pushTrack(of(track))) : of(undefined))),
      ),
    [peer, userMedia.screenshareVideoTrack$],
  );
  const pushedScreenshareTrack = useSubscribedState(pushedScreenshareTrack$);

  // TODO(burdon): Can we simplify?
  const context: CallContextType = {
    roomId,
    room,
    peer,
    userMedia,
    isSpeaking,

    joined,
    setJoined,
    dataSaverMode,
    setDataSaverMode,
    iceConnectionState,

    // TODO(burdon): Comment.
    pushedTracks: {
      video: trackObjectToString(pushedVideoTrack),
      audio: trackObjectToString(pushedAudioTrack),
      screenshare: trackObjectToString(pushedScreenshareTrack),
    },
    onTranscription,
  };

  return <CallContext.Provider value={context}>{children}</CallContext.Provider>;
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
