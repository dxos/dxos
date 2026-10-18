//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { SpeakingMonitor } from '@dxos/av';
import { Resource } from '@dxos/context';

import { type CallState } from './call-swarm-synchronizer.ts';
import { type MediaState } from './media-manager.ts';
import { type EncodedTrackName, TrackNameCodec, type UserState } from './types.ts';

export type SimulatedParticipantProps = {
  /** Display name on the participant's tile. */
  name: string;
  /** Video file (WebM in Chromium) whose picture and sound are the participant's camera and microphone. */
  src: string;
  /** A screen recording the participant shares from `start` seconds on the conversation clock. */
  screenshare?: { src: string; start: number };
};

/** One spoken line of a scripted conversation, timed in seconds from the top of the participants' files. */
export type SimulatedUtterance = {
  /** Display name of whoever speaks the line, local user included. */
  speaker: string;
  start: number;
  text: string;
};

type SimulatedParticipant = {
  user: UserState;
  videoTrackName: EncodedTrackName;
  audioTrackName: EncodedTrackName;
  video: HTMLVideoElement;
  stream: MediaStream;
  audioTrack: MediaStreamTrack;
  monitor: SpeakingMonitor;
  screenshare?: {
    start: number;
    trackName: EncodedTrackName;
    video: HTMLVideoElement;
    stream: MediaStream;
    on: boolean;
    /** The participant's own track record, whose `screenshareEnabled` the call reads. */
    tracks: NonNullable<UserState['tracks']>;
  };
};

const SESSION_ID = 'simulated';
const CLOCK_INTERVAL = 100;

/**
 * Participants with no network peer, whose camera and microphone are played from video files.
 * Stands in for the swarm and the SFU in stories, tests and demo recordings, where no EDGE is reachable:
 * the manager merges them into its call and media state as if their tracks had been pulled.
 */
export class CallSimulation extends Resource {
  /** Fires when a participant starts or stops speaking. */
  public readonly changed = new Event<void>();
  /** Fires as each scripted line starts playing, standing in for live transcription. */
  public readonly spoke = new Event<SimulatedUtterance>();

  readonly #props: SimulatedParticipantProps[];
  readonly #transcript: SimulatedUtterance[];
  readonly #participants: SimulatedParticipant[] = [];
  readonly #audioContext = new AudioContext();
  /** Kept here rather than in the swarm synchronizer, whose joined state would announce this device to EDGE. */
  #joined = false;
  #clock?: ReturnType<typeof setInterval>;

  constructor(participants: SimulatedParticipantProps[], transcript: SimulatedUtterance[] = []) {
    super();
    this.#props = participants;
    this.#transcript = [...transcript].sort((a, b) => a.start - b.start);
  }

  protected override async _open(): Promise<void> {
    for (const [index, props] of this.#props.entries()) {
      this.#participants.push(await this.#load(index, props));
    }
  }

  protected override async _close(): Promise<void> {
    this.#stopClock();
    for (const { video, stream, monitor, screenshare } of this.#participants) {
      await monitor.close();
      for (const { stream: tracks, video: player } of [{ stream, video }, ...(screenshare ? [screenshare] : [])]) {
        tracks.getTracks().forEach((track) => track.stop());
        player.pause();
        player.remove();
      }
    }
    this.#participants.length = 0;
    await this.#audioContext.close();
  }

  /** Joins the local user and plays every participant's file from the top, so a scripted conversation starts on one cue. */
  async join(): Promise<void> {
    this.#joined = true;
    await this.#audioContext.resume();
    await Promise.all(
      this.#participants.map(({ video }) => {
        video.currentTime = 0;
        return video.play();
      }),
    );
    this.#startClock();
  }

  leave(): void {
    this.#joined = false;
    this.#stopClock();
    for (const { screenshare } of this.#participants) {
      if (screenshare) {
        this.#share(screenshare, false);
      }
    }
  }

  /** Starts or stops a participant's screenshare; the grid shows its tile while `screenshareEnabled` is set. */
  #share(screenshare: NonNullable<SimulatedParticipant['screenshare']>, on: boolean): void {
    screenshare.on = on;
    screenshare.tracks.screenshareEnabled = on;
    if (on) {
      screenshare.video.currentTime = 0;
      void screenshare.video.play();
    } else {
      screenshare.video.pause();
    }
    this.changed.emit();
  }

  /**
   * Emits each line, and starts each screenshare, once the files reach its start; the furthest-along playing file is
   * the clock, so both stay on the audio. Once every file has ended, the clock runs on in real time, so events timed
   * past the files' end still fire.
   */
  #startClock(): void {
    this.#stopClock();
    const players = this.#participants.map(({ video }) => video);
    const shares = this.#participants.flatMap(({ screenshare }) => (screenshare ? [screenshare] : []));
    if (players.length === 0 || (this.#transcript.length === 0 && shares.length === 0)) {
      return;
    }

    let position = 0;
    let sampledAt = performance.now();
    const now = () => {
      const playing = players.filter((video) => !video.paused);
      if (playing.length === 0) {
        return position + (performance.now() - sampledAt) / 1_000;
      }
      position = Math.max(...playing.map((video) => video.currentTime));
      sampledAt = performance.now();
      return position;
    };

    let next = 0;
    this.#clock = setInterval(() => {
      const time = now();
      while (next < this.#transcript.length && time >= this.#transcript[next].start) {
        this.spoke.emit(this.#transcript[next++]);
      }
      for (const share of shares) {
        if (!share.on && time >= share.start) {
          this.#share(share, true);
        }
      }
      if (next >= this.#transcript.length && shares.every(({ on }) => on)) {
        this.#stopClock();
      }
    }, CLOCK_INTERVAL);
  }

  #stopClock(): void {
    clearInterval(this.#clock);
    this.#clock = undefined;
  }

  /** Adds the participants to the call (only once the local user has joined) and their media to the pulled tracks. */
  merge(
    { call, media }: { call: CallState; media: MediaState },
    self: UserState | undefined,
  ): {
    call: CallState;
    media: MediaState;
  } {
    const users = this.#participants.map(({ user, monitor }) => ({ ...user, speaking: monitor.isSpeaking }));
    const pulledVideoStreams = { ...media.pulledVideoStreams };
    const pulledAudioTracks = { ...media.pulledAudioTracks };
    for (const { videoTrackName, audioTrackName, stream, audioTrack, screenshare } of this.#participants) {
      pulledVideoStreams[videoTrackName] = { stream, ctx: this._ctx };
      pulledAudioTracks[audioTrackName] = { track: audioTrack, ctx: this._ctx };
      if (screenshare) {
        pulledVideoStreams[screenshare.trackName] = { stream: screenshare.stream, ctx: this._ctx };
      }
    }

    return {
      call:
        this.#joined && self
          ? { ...call, joined: true, self: { ...self, joined: true }, users: [...users, { ...self, joined: true }] }
          : { ...call, users: [] },
      media: { ...media, pulledVideoStreams, pulledAudioTracks },
    };
  }

  async #load(
    index: number,
    { name, src, screenshare: share }: SimulatedParticipantProps,
  ): Promise<SimulatedParticipant> {
    const { video, videoTrack, audioTrack } = await loadMediaFile(this.#audioContext, src);
    holdLastFrame(video);
    const stream = new MediaStream([videoTrack]);

    const monitor = new SpeakingMonitor(audioTrack);
    monitor.speakingChanged.on(this._ctx, () => this.changed.emit());
    await monitor.open();

    const id = `simulated-${index}`;
    const trackName = (kind: string) =>
      TrackNameCodec.encode({ sessionId: SESSION_ID, trackName: `${id}-${kind}`, mid: id });
    const videoTrackName = trackName('video');
    const audioTrackName = trackName('audio');
    const screenshareTrackName = trackName('screenshare');
    const tracks: NonNullable<UserState['tracks']> = {
      video: videoTrackName,
      videoEnabled: true,
      audio: audioTrackName,
      audioEnabled: true,
      ...(share ? { screenshare: screenshareTrackName, screenshareEnabled: false } : {}),
    };
    const screenshare = share && {
      start: share.start,
      trackName: screenshareTrackName,
      on: false,
      tracks,
      ...(await loadMediaFile(this.#audioContext, share.src).then(({ video, videoTrack }) => {
        holdLastFrame(video);
        return { video, stream: new MediaStream([videoTrack]) };
      })),
    };
    const user: UserState = { id, name, joined: true, raisedHand: false, speaking: false, tracks, activities: {} };

    return { user, videoTrackName, audioTrackName, video, stream, audioTrack, monitor, screenshare };
  }
}

/** A finished player stops producing frames and its tile goes black; hold the last frame instead. */
const holdLastFrame = (video: HTMLVideoElement) =>
  video.addEventListener('ended', () => {
    video.currentTime = Math.max(0, video.duration - 0.1);
  });

/**
 * Loads a video file into a hidden, paused player and returns its picture and sound as tracks.
 * Sound goes to the track only, which the call plays like any other audio; the player itself stays silent.
 */
export const loadMediaFile = async (
  audioContext: AudioContext,
  src: string,
): Promise<{ video: HTMLVideoElement; videoTrack: MediaStreamTrack; audioTrack: MediaStreamTrack }> => {
  const video = document.createElement('video');
  video.src = src;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  // Off screen rather than detached: a detached element's captured stream stops producing frames.
  video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(video);
  await new Promise<void>((resolve, reject) => {
    video.addEventListener('loadeddata', () => resolve(), { once: true });
    video.addEventListener(
      'error',
      () => {
        video.remove();
        reject(new Error(`cannot load media file ${src}`));
      },
      { once: true },
    );
  });

  const destination = audioContext.createMediaStreamDestination();
  audioContext.createMediaElementSource(video).connect(destination);
  return {
    video,
    videoTrack: video.captureStream().getVideoTracks()[0],
    audioTrack: destination.stream.getAudioTracks()[0],
  };
};
