//
// Copyright 2024 DXOS.org
//

import React, { useState, type FC, type PropsWithChildren, useEffect } from 'react';

import { scheduleMicroTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';

import {
  CallContext,
  type CallContextType,
  useIsSpeaking,
  useCfCallsConnection,
  useCallState,
  useStablePojo,
  useUserMedia,
} from '../hooks';
import { CALLS_URL, type TrackObject } from '../types';

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

  const call = useCallState({ roomId });
  const userMedia = useUserMedia();
  const isSpeaking = useIsSpeaking(userMedia.state.audioTrack);
  const { peer, iceConnectionState } = useCfCallsConnection({ iceServers, apiBase: `${CALLS_URL}/api/calls` });

  const [joined, setJoined] = useState(false);
  const [dataSaverMode, setDataSaverMode] = useState(false);

  const videoEncodingParams = useStablePojo<RTCRtpEncodingParameters[]>([
    {
      maxFramerate: maxWebcamFramerate,
      maxBitrate: maxWebcamBitrate,
    },
  ]);

  const [pushedVideoTrack, setPushedVideoTrack] = useState<TrackObject>();
  useEffect(() => {
    log.info('>>> push video track begin', { pushedVideoTrack, userMedia: userMedia.state.videoTrack });
    if (
      pushedVideoTrack &&
      userMedia.state.videoTrack &&
      pushedVideoTrack.trackName === userMedia.state.videoTrack.id
    ) {
      return;
    }

    scheduleMicroTask(new Context(), async () => {
      if (userMedia.state.videoTrack && peer) {
        const track = await peer.pushTrack(userMedia.state.videoTrack, videoEncodingParams);
        log.info('>>> push video track done', { track });
        setPushedVideoTrack(track);
      }
    });
  }, [peer, userMedia.state.videoTrack, videoEncodingParams]);

  const [pushedAudioTrack, setPushedAudioTrack] = useState<TrackObject>();
  useEffect(() => {
    scheduleMicroTask(new Context(), async () => {
      if (userMedia.state.publicAudioTrack && peer) {
        const track = await peer.pushTrack(userMedia.state.publicAudioTrack, [
          { networkPriority: 'high' },
        ] satisfies RTCRtpEncodingParameters[]);
        setPushedAudioTrack(track);
      }
    });
  }, [peer, userMedia.state.publicAudioTrack]);

  const [pushedScreenshareTrack, setPushedScreenshareTrack] = useState<TrackObject>();
  useEffect(() => {
    scheduleMicroTask(new Context(), async () => {
      if (userMedia.state.screenshareVideoTrack && peer) {
        const track = await peer.pushTrack(userMedia.state.screenshareVideoTrack);
        setPushedScreenshareTrack(track);
      }
    });
  }, [peer, userMedia.state.screenshareVideoTrack]);

  // TODO(burdon): Split root context vs. local call context.
  const context: CallContextType = {
    roomId,
    call,
    peer,
    userMedia,

    joined,
    setJoined,
    isSpeaking,

    iceConnectionState,
    dataSaverMode,
    setDataSaverMode,

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
