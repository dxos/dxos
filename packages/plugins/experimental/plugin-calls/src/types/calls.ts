//
// Copyright 2025 DXOS.org
//

import { buf } from '@dxos/protocols/buf';
import {
  UserStateSchema,
  type RoomStateSchema,
  type UserState as UserStateProto,
} from '@dxos/protocols/buf/dxos/edge/calls_pb';

export type UserState = buf.MessageInitShape<typeof UserStateSchema>;

export type RoomState = buf.MessageInitShape<typeof RoomStateSchema>;

export const codec = {
  encode: (message: UserState): Uint8Array => {
    return buf.toBinary(UserStateSchema, buf.create(UserStateSchema, message));
  },
  decode: (message: Uint8Array): UserStateProto => {
    return buf.fromBinary(UserStateSchema, message);
  },
};

export type SessionDescription = {
  type: 'offer' | 'answer';
  sdp: string;
};

export type TrackObject = {
  location?: 'local' | 'remote';
  trackName?: string;
  sessionId?: string;
  mid?: string | null;
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
