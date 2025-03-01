//
// Copyright 2024 DXOS.org
//

import React, { useState, type FC, type PropsWithChildren, useEffect } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';

import {
  CallContext,
  type CallContextType,
  useIsSpeaking,
  useCallsService,
  useCallState,
  useStablePojo,
  useUserMedia,
} from '../hooks';
import { CALLS_URL, type TrackObject } from '../types';

export type CallContextProviderProps = PropsWithChildren<Pick<CallContextType, 'roomId' | 'onTranscription'>>;

/**
 * Global context provider for calls.
 */
export const CallContextProvider: FC<CallContextProviderProps> = ({ children, roomId, onTranscription }) => {
  const config = useConfig();
  const iceServers = config.get('runtime.services.ice') ?? [];
  const maxWebcamFramerate = 24;
  const maxWebcamBitrate = 120_0000;

  const call = useCallState({ roomId });
  const userMedia = useUserMedia();
  const isSpeaking = useIsSpeaking(userMedia.state.audioTrack);
  const { peer, iceConnectionState } = useCallsService({ iceServers, apiBase: `${CALLS_URL}/api/calls` });

  const [joined, setJoined] = useState(false);
  const [dataSaverMode, setDataSaverMode] = useState(false);

  const videoEncodingParams = useStablePojo<RTCRtpEncodingParameters[]>([
    {
      maxFramerate: maxWebcamFramerate,
      maxBitrate: maxWebcamBitrate,
    },
  ]);

  //
  // Push video track.
  //
  // TODO(mykola): Add cleanup of pushed video track.
  const [pushedVideoTrack, setPushedVideoTrack] = useState<TrackObject>();
  useEffect(() => {
    if (!peer) {
      return;
    }
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      if (!peer || (!userMedia.state.videoTrack && !pushedVideoTrack)) {
        return;
      }

      log('push video track', { userMedia: userMedia.state.videoTrack, pushedVideoTrack });
      const track = userMedia.state.videoTrack;
      const pushedTrack = await peer.pushTrack(track ?? null, videoEncodingParams, pushedVideoTrack);
      setPushedVideoTrack(pushedTrack);
    });
    return () => {
      void ctx.dispose();
    };
  }, [peer?.session, userMedia.state.videoTrack, videoEncodingParams]);

  //
  // Push audio track.
  //
  const [pushedAudioTrack, setPushedAudioTrack] = useState<TrackObject>();
  useEffect(() => {
    if (!peer) {
      return;
    }
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      if (!peer || (!userMedia.state.audioTrack && !pushedAudioTrack)) {
        return;
      }

      log('push audio track', { userMedia: userMedia.state.audioTrack, pushedAudioTrack });
      const track = userMedia.state.audioTrack;
      const pushedTrack = await peer.pushTrack(track ?? null, [{ networkPriority: 'high' }], pushedAudioTrack);
      setPushedAudioTrack(pushedTrack);
    });
    return () => {
      void ctx.dispose();
    };
  }, [peer?.session, userMedia.state.audioTrack]);

  //
  // Push screenshare track.
  //
  const [pushedScreenshareTrack, setPushedScreenshareTrack] = useState<TrackObject>();
  useEffect(() => {
    if (!peer || !userMedia.state.screenshareVideoTrack) {
      return;
    }
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      if (!peer || !userMedia.state.screenshareVideoTrack) {
        return;
      }

      log('push screenshare track', { userMedia: userMedia.state.screenshareVideoTrack });
      const track = userMedia.state.screenshareVideoTrack;
      const pushedTrack = await peer.pushTrack(track, undefined, pushedScreenshareTrack);
      setPushedScreenshareTrack(pushedTrack);
    });
    return () => {
      void ctx.dispose();
    };
  }, [peer?.session, userMedia.state.screenshareVideoTrack]);

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
