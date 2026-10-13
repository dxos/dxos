//
// Copyright 2026 DXOS.org
//

import { SpeakingMonitor } from '@dxos/av';
import { type Database, type Feed, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import type * as Meeting from '@dxos/plugin-meeting/Meeting';
import type * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';
import { Message } from '@dxos/types';

import { type MeetingRecorderCapabilities } from '#types';

import { PcmTrackSource } from './pcm-track.ts';

export type MeetingSessionOptions = {
  provider: TranscriptionCapabilities.TranscriptionManagerProvider;
  bridge: MeetingRecorderCapabilities.CaptureBridge;
  db: Database.Database;
  meeting: Meeting.Meeting;
  /** Also transcribe the system audio output, when the host supports it. */
  captureSystemAudio: boolean;
  /** Byline for system-audio messages, e.g. `Zoom participants`. */
  othersLabel: string;
};

/** One audio source feeding the meeting's transcript through its own transcription manager. */
type Channel = {
  manager: TranscriptionCapabilities.TranscriptionManager;
  monitor: SpeakingMonitor;
  release: () => Promise<void>;
};

/**
 * A recording in progress. The microphone and the system audio each get their own transcription
 * manager writing into the meeting's one transcript feed, so every message keeps its speaker: the
 * local identity for the microphone, {@link MeetingSessionOptions.othersLabel} for everyone else.
 * Each manager is gated by a {@link SpeakingMonitor}, which is how a call's transcription knows when
 * an utterance ends, so segments break at pauses instead of every ten seconds.
 */
export class MeetingSession {
  readonly #options: MeetingSessionOptions;
  readonly #channels: Channel[] = [];
  #systemAudio = false;

  constructor(options: MeetingSessionOptions) {
    this.#options = options;
  }

  /** Whether the other participants are being transcribed (false when only the microphone is). */
  get systemAudio(): boolean {
    return this.#systemAudio;
  }

  async start(): Promise<void> {
    const { bridge, meeting, captureSystemAudio, othersLabel } = this.#options;
    const transcript = await meeting.transcript.load();
    const feed = await transcript.feed.load();

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      await this.#addChannel(feed, micStream.getAudioTracks()[0], {}, async () => {
        micStream.getTracks().forEach((track) => track.stop());
      });

      const support = await bridge.getSupport();
      if (captureSystemAudio && support.systemAudio) {
        await this.#startSystemAudio(feed, othersLabel);
      }
    } catch (err) {
      await this.stop();
      throw err;
    }
  }

  /** Stops capture, transcribing the audio still buffered before the managers close. */
  async stop(): Promise<void> {
    const channels = this.#channels.splice(0);
    await Promise.all(
      channels.map(async ({ manager, monitor, release }) => {
        await monitor.close();
        manager.setRecording(false);
        await manager.flush().catch((err) => log.warn('final transcription failed', { err }));
        await manager.close();
        await release();
      }),
    );
  }

  async #startSystemAudio(feed: Feed.Feed, othersLabel: string): Promise<void> {
    const { bridge } = this.#options;
    let source: PcmTrackSource | undefined;
    try {
      // Chunks arriving before the sample rate is known (a few ms) are dropped.
      const { sampleRate } = await bridge.startSystemAudio((samples) => source?.push(samples));
      source = new PcmTrackSource(sampleRate);
      const pcmSource = source;
      await this.#addChannel(
        feed,
        pcmSource.track,
        {
          messageEnricher: async (message) =>
            Obj.make(Message.Message, {
              created: message.created,
              blocks: message.blocks,
              sender: { name: othersLabel },
            }),
        },
        async () => {
          await bridge.stopSystemAudio();
          await pcmSource.close();
        },
      );
      this.#systemAudio = true;
    } catch (err) {
      // Without the screen & system audio permission the meeting is still worth recording.
      log.warn('system audio unavailable; recording the microphone only', { err });
      await bridge.stopSystemAudio().catch(() => {});
      await source?.close();
    }
  }

  async #addChannel(
    feed: Feed.Feed,
    track: MediaStreamTrack,
    props: TranscriptionCapabilities.TranscriptionManagerProviderProps,
    release: () => Promise<void>,
  ): Promise<void> {
    const { provider, db } = this.#options;
    const manager = provider(props);
    manager.setFeed(db, feed);
    await manager.open();
    await manager.setEnabled(true);
    await manager.setAudioTrack(track);

    const monitor = new SpeakingMonitor(track);
    monitor.speakingChanged.on((speaking) => manager.setRecording(speaking));
    await monitor.open();
    this.#channels.push({ manager, monitor, release });
  }
}
