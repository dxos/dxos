//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { TestDatabaseLayer } from '@dxos/compute-runtime/testing';
import { Database, Feed, Filter } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type AudioChunk, type AudioRecorder, type WhisperSegment } from '@dxos/pipeline-transcription';
import { Message } from '@dxos/types';

import { TranscriptionManagerImpl } from './transcription-manager.ts';

const T0 = Date.parse('2026-01-01T00:00:00.000Z');

/** 200 ms at 16 kHz. */
const CHUNK_SAMPLES = 3_200;

const WAV_HEADER_BYTES = 44;

/** A stand-in microphone (node has no `MediaStreamTrack`); only its identity is compared. */
class FakeTrack extends EventTarget implements MediaStreamTrack {
  contentHint = '';
  enabled = true;
  readonly id = crypto.randomUUID();
  readonly kind = 'audio';
  readonly label = 'fake microphone';
  readonly muted = false;
  readonly readyState = 'live';
  onended = null;
  onmute = null;
  onunmute = null;
  async applyConstraints(): Promise<void> {}
  clone(): MediaStreamTrack {
    return new FakeTrack();
  }
  getCapabilities(): MediaTrackCapabilities {
    return {};
  }
  getConstraints(): MediaTrackConstraints {
    return {};
  }
  getSettings(): MediaTrackSettings {
    return {};
  }
  stop(): void {}
}

/** Emits chunks on demand in place of the Web Audio graph. */
class FakeRecorder implements AudioRecorder {
  readonly wavConfig = { channels: 1, sampleRate: 16_000, bitDepthCode: '16' };
  #onChunk?: (chunk: AudioChunk) => void;
  started = false;

  setOnChunk(onChunk: (chunk: AudioChunk) => void): void {
    this.#onChunk = onChunk;
  }

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
  }

  speak(chunks: number): void {
    for (let index = 0; index < chunks; index++) {
      this.#onChunk?.({ timestamp: T0 + index * 200, data: new Float64Array(CHUNK_SAMPLES).fill(1_000) });
    }
  }
}

const segment = (text: string): WhisperSegment => ({
  text,
  start: 0,
  end: 1,
  no_speech_prob: 0,
  words: text.split(' ').map((word, index) => ({ word: ` ${word}`, start: index * 0.2, end: index * 0.2 + 0.2 })),
});

const setup = Effect.gen(function* () {
  const { db } = yield* Database.Service;
  const feed = yield* Database.add(Feed.make());
  const recorder = new FakeRecorder();
  const requests: string[] = [];
  const manager = new TranscriptionManagerImpl({
    registry: Registry.make(),
    createRecorder: () => recorder,
    transcribe: async (audio) => {
      requests.push(audio);
      return [segment('kai create the summary')];
    },
  });
  manager.setFeed(db, feed).setIdentityDid('did:key:alice');
  yield* Effect.promise(() => manager.open());
  return { db, feed, recorder, requests, manager };
});

const messages = (feed: Feed.Feed) => Feed.query(feed, Filter.type(Message.Message)).run;

const run = <A>(effect: Effect.Effect<A, never, Database.Service>) =>
  effect.pipe(Effect.provide(TestDatabaseLayer({ types: [Message.Message] })), EffectEx.runAndForwardErrors);

describe('TranscriptionManagerImpl', () => {
  test('an utterance on an enabled manager lands in the transcript feed', async ({ expect }) => {
    await run(
      Effect.gen(function* () {
        const { feed, recorder, manager } = yield* setup;
        yield* Effect.promise(() => manager.setAudioTrack(new FakeTrack()));
        yield* Effect.promise(() => manager.setEnabled(true));
        expect(recorder.started).toBe(true);

        manager.setRecording(true);
        recorder.speak(5);
        yield* Effect.promise(() => manager.flush());

        const written = yield* messages(feed);
        expect(written).toHaveLength(1);
        expect(written[0].sender.identityDid).toBe('did:key:alice');
        expect(written[0].blocks).toMatchObject([{ _tag: 'transcript', text: 'kai create the summary' }]);
        yield* Effect.promise(() => manager.close());
      }),
    );
  });

  test('speech that began before transcription was enabled is recorded', async ({ expect }) => {
    await run(
      Effect.gen(function* () {
        const { feed, recorder, requests, manager } = yield* setup;
        yield* Effect.promise(() => manager.setAudioTrack(new FakeTrack()));
        manager.setRecording(true);
        yield* Effect.promise(() => manager.setEnabled(true));

        // More than the 10-chunk pre-roll an idle transcriber keeps, so a dropped start shows as lost audio.
        recorder.speak(15);
        yield* Effect.promise(() => manager.flush());

        expect(requests).toHaveLength(1);
        expect(Buffer.from(requests[0], 'base64').length).toBe(WAV_HEADER_BYTES + 15 * CHUNK_SAMPLES * 2);
        expect(yield* messages(feed)).toHaveLength(1);
        yield* Effect.promise(() => manager.close());
      }),
    );
  });

  test('a disabled manager records nothing', async ({ expect }) => {
    await run(
      Effect.gen(function* () {
        const { feed, recorder, requests, manager } = yield* setup;
        yield* Effect.promise(() => manager.setAudioTrack(new FakeTrack()));
        manager.setRecording(true);
        expect(recorder.started).toBe(false);

        yield* Effect.promise(() => manager.flush());
        expect(requests).toEqual([]);
        expect(yield* messages(feed)).toHaveLength(0);
        yield* Effect.promise(() => manager.close());
      }),
    );
  });
});
