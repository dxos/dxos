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
};

type SimulatedParticipant = {
  user: UserState;
  videoTrackName: EncodedTrackName;
  audioTrackName: EncodedTrackName;
  video: HTMLVideoElement;
  stream: MediaStream;
  audioTrack: MediaStreamTrack;
  monitor: SpeakingMonitor;
};

const SESSION_ID = 'simulated';

/**
 * Participants with no network peer, whose camera and microphone are played from video files.
 * Stands in for the swarm and the SFU in stories, tests and demo recordings, where no EDGE is reachable:
 * the manager merges them into its call and media state as if their tracks had been pulled.
 */
export class CallSimulation extends Resource {
  /** Fires when a participant starts or stops speaking. */
  public readonly changed = new Event<void>();

  readonly #props: SimulatedParticipantProps[];
  readonly #participants: SimulatedParticipant[] = [];
  readonly #audioContext = new AudioContext();

  constructor(participants: SimulatedParticipantProps[]) {
    super();
    this.#props = participants;
  }

  protected override async _open(): Promise<void> {
    for (const [index, props] of this.#props.entries()) {
      this.#participants.push(await this.#load(index, props));
    }
  }

  protected override async _close(): Promise<void> {
    for (const { video, stream, monitor } of this.#participants) {
      await monitor.close();
      stream.getTracks().forEach((track) => track.stop());
      video.pause();
      video.remove();
    }
    this.#participants.length = 0;
    await this.#audioContext.close();
  }

  /** Plays every participant's file from the top, so a scripted conversation starts on one cue. */
  async start(): Promise<void> {
    await this.#audioContext.resume();
    await Promise.all(
      this.#participants.map(({ video }) => {
        video.currentTime = 0;
        return video.play();
      }),
    );
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
    for (const { videoTrackName, audioTrackName, stream, audioTrack } of this.#participants) {
      pulledVideoStreams[videoTrackName] = { stream, ctx: this._ctx };
      pulledAudioTracks[audioTrackName] = { track: audioTrack, ctx: this._ctx };
    }

    return {
      call: call.joined && self ? { ...call, self, users: [...users, self] } : { ...call, users: [] },
      media: { ...media, pulledVideoStreams, pulledAudioTracks },
    };
  }

  async #load(index: number, { name, src }: SimulatedParticipantProps): Promise<SimulatedParticipant> {
    const video = document.createElement('video');
    video.src = src;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    // Off screen rather than detached: a detached element's captured stream stops producing frames.
    video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);
    await new Promise<void>((resolve, reject) => {
      video.addEventListener('loadeddata', () => resolve(), { once: true });
      video.addEventListener('error', () => reject(new Error(`simulated participant ${name}: cannot load ${src}`)), {
        once: true,
      });
    });

    // Sound goes to the track only, which the call plays like any pulled audio; the element itself stays silent.
    const destination = this.#audioContext.createMediaStreamDestination();
    this.#audioContext.createMediaElementSource(video).connect(destination);
    const audioTrack = destination.stream.getAudioTracks()[0];
    const stream = new MediaStream(video.captureStream().getVideoTracks());

    const monitor = new SpeakingMonitor(audioTrack);
    monitor.speakingChanged.on(this._ctx, () => this.changed.emit());
    await monitor.open();

    const id = `simulated-${index}`;
    const trackName = (kind: string) =>
      TrackNameCodec.encode({ sessionId: SESSION_ID, trackName: `${id}-${kind}`, mid: id });
    const videoTrackName = trackName('video');
    const audioTrackName = trackName('audio');
    const user: UserState = {
      id,
      name,
      joined: true,
      raisedHand: false,
      speaking: false,
      tracks: { video: videoTrackName, videoEnabled: true, audio: audioTrackName, audioEnabled: true },
      activities: {},
    };

    return { user, videoTrackName, audioTrackName, video, stream, audioTrack, monitor };
  }
}
