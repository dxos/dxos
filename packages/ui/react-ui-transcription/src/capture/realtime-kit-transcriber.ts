//
// Copyright 2026 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type RealtimeKitMeeting, type RealtimeKitTranscript, connectRealtimeKit, transcriptStarted } from '@dxos/av';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';
import { type CreateTranscriber, type Transcriber, type TranscriberCallbacks } from '@dxos/pipeline-transcription';
import { type ContentBlock } from '@dxos/types';

/** Mints a participant token for this identity's one-person transcription meeting (`EdgeHttpClient.joinTranscription`). */
export type JoinTranscription = () => Promise<{ authToken: string }>;

export type RealtimeKitTranscriberOptions = {
  /** The audio to transcribe: a microphone, a file playing, or system audio. */
  audioStreamTrack: MediaStreamTrack;
  join: JoinTranscription;
};

/**
 * Upper bound on how long {@link Transcriber.flush} waits for the final segment of speech already sent: a final
 * normally follows the last partial within a second, and an utterance that never finalises must not hang a drain.
 */
const FLUSH_TIMEOUT_MS = 3_000;

/** Builds the RealtimeKit transcriber for a track; what consumers pass wherever a {@link CreateTranscriber} is taken. */
export const createRealtimeKitTranscriber =
  (options: RealtimeKitTranscriberOptions): CreateTranscriber =>
  (callbacks) =>
    new RealtimeKitTranscriber(options, callbacks);

/**
 * Live transcription through Cloudflare RealtimeKit: the track is published to a meeting where this device is the
 * only participant, and the meeting's own transcription (the same one calls use) streams back the device's words.
 *
 * Audio is heard only between {@link start} and {@link stop}, which is what a speaking gate or push-to-talk toggles.
 */
export class RealtimeKitTranscriber extends Resource implements Transcriber {
  #meeting?: RealtimeKitMeeting;
  #unsubscribe: (() => void)[] = [];
  /**
   * Our own clone of the caller's track, published once: `stop` mutes it rather than unpublishing, since a speaking
   * gate toggles at every pause and a republish each time would clip the start of the next utterance.
   */
  #sending?: MediaStreamTrack;
  /** Media changes run in call order: an `enableAudio` still connecting must not land after a later `disableAudio`. */
  #media: Promise<void> = Promise.resolve();
  /** Segment deliveries run in arrival order, each waiting for the previous `onSegments` to settle. */
  #delivery: Promise<void> = Promise.resolve();
  /** Set while RealtimeKit has reported a partial transcript that has not yet been finalised. */
  #pending = false;
  #settled = new Trigger();

  constructor(
    private readonly _options: RealtimeKitTranscriberOptions,
    private readonly _callbacks: TranscriberCallbacks,
  ) {
    super();
    this.#settled.wake();
  }

  protected override async _open(): Promise<void> {
    const { authToken } = await this._options.join();
    const meeting = await connectRealtimeKit(authToken);
    this.#meeting = meeting;
    this.#unsubscribe = [meeting.onTranscript(this.#onTranscript), meeting.onRoomLeft(this.#onRoomLeft)];
  }

  protected override async _close(): Promise<void> {
    const meeting = this.#meeting;
    this.#meeting = undefined;
    this.#release();
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    if (meeting) {
      await this.#media;
      await meeting.leave();
    }
    this.#sending?.stop();
    this.#sending = undefined;
  }

  start(): void {
    const meeting = this.#meeting;
    if (!meeting) {
      return;
    }
    if (this.#sending) {
      this.#sending.enabled = true;
      return;
    }
    const sending = this._options.audioStreamTrack.clone();
    this.#sending = sending;
    this.#enqueueMedia(() => meeting.self.enableAudio(sending));
  }

  stop(): void {
    if (this.#sending) {
      this.#sending.enabled = false;
    }
  }

  async flush(): Promise<void> {
    this.stop();
    await this.#media;
    await this.#settled.wait({ timeout: FLUSH_TIMEOUT_MS }).catch(() => {
      log.info('transcription flush timed out waiting for a final segment');
    });
    await this.#delivery;
  }

  abort(): void {
    this.#release();
  }

  #enqueueMedia(change: () => Promise<void> | void): void {
    this.#media = this.#media.then(change).catch((err) => log.catch(err));
  }

  #release(): void {
    this.#pending = false;
    this.#settled.wake();
  }

  readonly #onTranscript = (data: RealtimeKitTranscript): void => {
    // An identity can run several transcriptions at once (microphone and system audio, or two devices), each a peer
    // of the same participant in its one meeting, so a peer keeps only its own words.
    if (!this.#meeting || data.peerId !== this.#meeting.self.id) {
      return;
    }
    if (data.isPartialTranscript) {
      if (!this.#pending) {
        this.#pending = true;
        this.#settled.reset();
      }
      return;
    }

    this.#release();
    const text = data.transcript.trim();
    if (text.length === 0) {
      return;
    }
    const segment: ContentBlock.Transcript = {
      _tag: 'transcript',
      started: transcriptStarted(data),
      text,
    };
    this.#delivery = this.#delivery.then(() => this._callbacks.onSegments([segment])).catch((err) => log.catch(err));
  };

  readonly #onRoomLeft = (state: string): void => {
    log.info('transcription meeting left', { state });
    this.#release();
  };
}
