//
// Copyright 2024 DXOS.org
//

import { schema } from '@dxos/protocols/proto';

export const codec = schema.getCodecForType('dxos.edge.calls.UserState');

export interface SessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface ErrorResponse {
  errorCode?: string;
  errorDescription?: string;
}

export type TrackObject = {
  location?: 'local' | 'remote';
  trackName?: string;
  sessionId?: string;
  mid?: string | null;
};

export interface TracksResponse extends ErrorResponse {
  sessionDescription: SessionDescription;
  requiresImmediateRenegotiation: boolean;
  tracks?: (TrackObject & ErrorResponse)[];
}

export interface RenegotiationResponse extends ErrorResponse {}
