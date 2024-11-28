//
// Copyright 2024 DXOS.org
//

export type User = {
  id: string;
  name: string;
  transceiverSessionId?: string;
  raisedHand: boolean;
  speaking: boolean;
  joined: boolean;
  tracks: {
    audio?: string;
    audioEnabled?: boolean;
    video?: string;
    videoEnabled?: boolean;
    screenshare?: string;
    screenShareEnabled?: boolean;
  };
};

export type RoomState = {
  meetingId?: string;
  users: User[];
};

export type ServerMessage =
  | {
      type: 'roomState';
      state: RoomState;
    }
  | {
      type: 'error';
      error?: string;
    }
  | {
      type: 'directMessage';
      from: string;
      message: string;
    }
  | {
      type: 'muteMic';
    }
  | {
      type: 'partyserver-pong';
    };

export type ClientMessage =
  | {
      type: 'userUpdate';
      user: User;
    }
  | {
      type: 'directMessage';
      to: string;
      message: string;
    }
  | {
      type: 'muteUser';
      id: string;
    }
  | {
      type: 'userLeft';
    }
  | {
      type: 'partyserver-ping';
    };

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
