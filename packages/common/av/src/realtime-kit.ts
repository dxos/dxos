//
// Copyright 2026 DXOS.org
//

// The subset of the `@cloudflare/realtimekit` SDK that calls and transcription use, so each can be tested offline.

export interface RealtimeKitSelf {
  /** This connection's peer id; transcripts name the peer that spoke. */
  readonly id: string;
  /** Publish the local mic. RealtimeKit accepts an already-captured track (no double capture). */
  enableAudio(customTrack?: MediaStreamTrack): Promise<void>;
  disableAudio(): Promise<void> | void;
  enableVideo(customTrack?: MediaStreamTrack): Promise<void>;
  disableVideo(): Promise<void> | void;
  /** Unlike {@link enableVideo}, RealtimeKit captures the display itself and exposes it on {@link screenShareTracks}. */
  enableScreenShare(): Promise<void>;
  disableScreenShare(): Promise<void>;
  readonly screenShareTracks?: { audio?: MediaStreamTrack; video?: MediaStreamTrack };
}

export interface RealtimeKitRemoteParticipant {
  /** The label the participant chose when it joined (its device key in a call); not verified, so never trust it. */
  customParticipantId?: string;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
  /** Screenshare is a distinct track pair in RealtimeKit, not the camera `videoTrack`. */
  screenShareTracks?: { audio?: MediaStreamTrack; video?: MediaStreamTrack };
}

/** Native transcription segment as delivered by RealtimeKit's `meeting.ai`. */
export interface RealtimeKitTranscript {
  peerId: string;
  transcript: string;
  isPartialTranscript: boolean;
  /** The SDK types the time as `date`; RealtimeKit's docs call it `timestamp` (epoch ms), so both are read. */
  date?: Date;
  timestamp?: number;
}

/** WebRTC send-side stats for each locally-published track. */
export type RealtimeKitStats = { outbound: { kind: string; stats: Record<string, unknown> }[] };

export interface RealtimeKitMeeting {
  readonly self: RealtimeKitSelf;
  /** Currently-joined remote participants. */
  getRemoteParticipants(): RealtimeKitRemoteParticipant[];
  /** Fires, with no payload, when a participant joins or leaves or changes a track. Returns an unsubscribe. */
  onMediaChanged(callback: () => void): () => void;
  /** Subscribe to native transcription events; returns an unsubscribe. */
  onTranscript(callback: (transcript: RealtimeKitTranscript) => void): () => void;
  /** Subscribe to RealtimeKit leaving the room on its own (`LeaveRoomState`); returns an unsubscribe. */
  onRoomLeft(callback: (state: string) => void): () => void;
  getStats(): Promise<RealtimeKitStats>;
  leave(): Promise<void>;
}

/** Joins a RealtimeKit meeting with a participant token minted by calls-service. */
export type ConnectRealtimeKit = (authToken: string) => Promise<RealtimeKitMeeting>;

/** Time of a transcript as an ISO string, from either field RealtimeKit sends, else now. */
export const transcriptStarted = ({ date, timestamp }: RealtimeKitTranscript): string => {
  const time = date instanceof Date ? date.getTime() : timestamp;
  return new Date(time !== undefined && Number.isFinite(time) ? time : Date.now()).toISOString();
};

/** Binds {@link RealtimeKitMeeting} to the real SDK, imported lazily so it loads only when a session starts. */
export const connectRealtimeKit: ConnectRealtimeKit = async (authToken) => {
  const { default: RealtimeKitClient } = await import('@cloudflare/realtimekit');
  // No auto-capture: the caller owns capture.
  const meeting = await RealtimeKitClient.init({ authToken, defaults: { audio: false, video: false } });
  // `init` only prepares the client; `join` connects.
  await meeting.join();
  return {
    self: meeting.self,
    getRemoteParticipants: () => meeting.participants.joined.toArray(),
    onMediaChanged: (callback) => {
      // Per-participant media events too: a track can be swapped while its participant stays in the roster.
      const joined = meeting.participants.joined;
      const mediaEvents = ['videoUpdate', 'audioUpdate', 'screenShareUpdate'] as const;
      type JoinedParticipant = ReturnType<typeof joined.toArray>[number];
      const attach = (participant: JoinedParticipant) =>
        mediaEvents.forEach((event) => participant.on(event, callback));
      const detach = (participant: JoinedParticipant) =>
        mediaEvents.forEach((event) => participant.off(event, callback));
      joined.toArray().forEach(attach);
      const onJoined = (participant: JoinedParticipant) => {
        attach(participant);
        callback();
      };
      const onLeft = (participant: JoinedParticipant) => {
        detach(participant);
        callback();
      };
      joined.on('participantJoined', onJoined);
      joined.on('participantLeft', onLeft);
      return () => {
        joined.toArray().forEach(detach);
        joined.off('participantJoined', onJoined);
        joined.off('participantLeft', onLeft);
      };
    },
    onTranscript: (callback) => {
      meeting.ai.on('transcript', callback);
      return () => meeting.ai.off('transcript', callback);
    },
    onRoomLeft: (callback) => {
      const listener = ({ state }: { state: string }) => callback(state);
      meeting.self.on('roomLeft', listener);
      return () => meeting.self.off('roomLeft', listener);
    },
    getStats: async () => {
      // Only local producers expose `getStats()` publicly.
      const outbound = await Promise.all(
        meeting.self.producers.map(async (producer) => {
          const stats: Record<string, unknown> = {};
          (await producer.getStats()).forEach((entry, id) => {
            stats[id] = entry;
          });
          return { kind: producer.kind, stats };
        }),
      );
      return { outbound };
    },
    leave: () => meeting.leave(),
  };
};
