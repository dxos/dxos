//
// Copyright 2025 DXOS.org
//

import { signal } from '@preact/signals-core';

import { type Context, Resource } from '@dxos/context';
import { type TranscriptionState } from '@dxos/plugin-transcription/types';

import { type TrackObject, type RoomState, type UserState } from '../types';
import { type CallsServicePeer } from '../util';

export type GlobalState = {
  /**
   * Self media state.
   */
  media?: {
    audioDeviceId?: string;
    audioEnabled?: boolean;
    audioTrack?: MediaStreamTrack;

    videoDeviceId?: string;
    videoEnabled?: boolean;
    videoTrack?: MediaStreamTrack;

    screenshareEnabled?: boolean;
    screenshareVideoTrack?: MediaStreamTrack;
  };

  call?: {
    room: RoomState;
    self: UserState;
    transcription: TranscriptionState;
  };

  
};

/**
 * Manages the call state for the current call.
 * Stores it inside live object to ensure state is reactive.
 */
export class CallManager extends Resource {
  private readonly _state = signal<GlobalState>({});
  private _callsServicePeer?: CallsServicePeer;

  private _pushedVideoTrack?: MediaStreamTrack;
  private _pushedAudioTrack?: MediaStreamTrack;
  private _pushedScreenshareTrack?: MediaStreamTrack;

  get media() {
    return this._state.value.media;
  }

  get call() {
    return this._state.value.call;
  }

  async pullMediaStreamTrack({ ctx, trackName }: { ctx: Context; trackName: string }) {
    const track = this._state.value.pulledTracks?.get(trackName);
    if (track) {
      return track;
    }

    const trackData = TrackNameCodec.decode(trackName);
    const pulledTrack = await this._callsServicePeer?.pullTrack({ ctx, trackData });
    if (!pulledTrack) {
      return;
    }

    this._state.value.pulledTracks?.set(trackName, pulledTrack);
    return track;
  }
}

const TrackNameCodec = {
  encode: (trackData: TrackObject): string => {
    return trackData.sessionId + '/' + trackData.trackName;
  },
  decode: (name: string): TrackObject => {
    const [sessionId, trackName] = name.split('/');
    return { sessionId, trackName, location: 'remote' };
  },
};
