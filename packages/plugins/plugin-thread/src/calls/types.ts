//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { buf } from '@dxos/protocols/buf';
import {
  type ActivitySchema,
  type UserState as UserStateProto,
  UserStateSchema,
} from '@dxos/protocols/buf/dxos/edge/calls_pb';

/**
 * Endpoint to the calls service.
 */
export const CALLS_URL = 'https://calls-service.dxos.workers.dev';

export type UserState = buf.MessageInitShape<typeof UserStateSchema>;

export type ActivityState = buf.MessageInitShape<typeof ActivitySchema>;

export const codec = {
  encode: (message: UserState): Uint8Array => buf.toBinary(UserStateSchema, buf.create(UserStateSchema, message)),
  decode: (message: Uint8Array): UserStateProto => buf.fromBinary(UserStateSchema, message),
};

export type TrackObject = {
  location?: 'local' | 'remote';
  trackName?: string;
  sessionId?: string;
  mid?: string | null;
};

export type SessionDescription = {
  type: 'offer' | 'answer';
  sdp: string;
};

export interface ErrorResponse {
  errorCode?: string;
  errorDescription?: string;
}

export interface SessionResponse extends ErrorResponse {
  sessionId: string;
  sessionDescription: SessionDescription;
}

export interface TracksResponse extends ErrorResponse {
  sessionDescription: SessionDescription;
  requiresImmediateRenegotiation: boolean;
  tracks?: (TrackObject & ErrorResponse)[];
}

export interface RenegotiationResponse extends ErrorResponse {}

export type EncodedTrackName = string & { __brand: 'EncodedTrackName' };

export const TrackNameCodec = {
  encode: (trackData: TrackObject): EncodedTrackName => {
    invariant(trackData.sessionId);
    invariant(trackData.trackName);
    invariant(trackData.mid);
    return (trackData.sessionId + '/' + trackData.trackName + '/' + trackData.mid) as EncodedTrackName;
  },
  decode: (name: EncodedTrackName): TrackObject => {
    const [sessionId, trackName, mid] = name.split('/');
    return { sessionId, trackName, location: 'remote', mid };
  },
};
