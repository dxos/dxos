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

/** Runs one teardown step, logging its failure so the next step still runs. */
const attempt = async (step: string, run: () => unknown): Promise<void> => {
  await Promise.resolve()
    .then(run)
    .catch((err) => log.warn('recording teardown step failed', { step, err }));
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
    // Every step runs even when an earlier one fails, so the device is always released; failures are
    // logged rather than thrown because the meeting is already saved and Stop still has to summarize it.
    await Promise.all(
      channels.map(async ({ manager, monitor, release }) => {
        await attempt('close speaking monitor', () => monitor.close());
        await attempt('pause transcription', () => manager.setRecording(false));
        await attempt('final transcription', () => manager.flush());
        await attempt('close transcription manager', () => manager.close());
        await attempt('release audio device', release);
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
      await source.resume();
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
      await bridge.stopSystemAudio().catch((err) => log.catch(err));
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
    let manager: TranscriptionCapabilities.TranscriptionManager | undefined;
    let monitor: SpeakingMonitor | undefined;
    try {
      // Constructed inside the guard, so a provider that throws still releases the device.
      const channelManager = provider(props);
      manager = channelManager;
      const channelMonitor = new SpeakingMonitor(track);
      monitor = channelMonitor;
      channelManager.setFeed(db, feed);
      await channelManager.open();
      await channelManager.setEnabled(true);
      await channelManager.setAudioTrack(track);
      channelMonitor.speakingChanged.on((speaking) => channelManager.setRecording(speaking));
      await channelMonitor.open();
      this.#channels.push({ manager: channelManager, monitor: channelMonitor, release });
    } catch (err) {
      // Not yet in `#channels`, so `stop` would never release it.
      const failedMonitor = monitor;
      const failedManager = manager;
      await attempt('close speaking monitor', () => failedMonitor?.close());
      await attempt('close transcription manager', () => failedManager?.close());
      await attempt('release audio device', release);
      throw err;
    }
  }
}
