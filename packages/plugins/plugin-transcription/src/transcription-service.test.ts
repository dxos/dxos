//
// Copyright 2026 DXOS.org
//

/**
 * Sends a recorded utterance through the production `Transcriber` to a deployed EDGE transcription
 * endpoint (calls-service `POST /transcribe`, Workers AI Whisper) and checks the segments that come
 * back — the path a call's or a recording's transcript takes before it is appended to the feed.
 *
 * Tagged `manual` (run with `DX_RUN_MANUAL_TESTS=1`) because it reaches the network; it skips unless
 * the agents-scope fixture is pulled (`moon run fixtures:pull -- whistle-one-two-three --scope agents`).
 * `DX_EDGE_URL` picks the environment (default: dev).
 */

import { readFileSync } from 'node:fs';
import { describe, test } from 'vitest';

import { Config, EDGE_URLS, EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { fixtureExists, fixturePath } from '@dxos/fixtures';
import { type AudioChunk, type AudioRecorder, Transcriber } from '@dxos/pipeline-transcription';
import { type ContentBlock } from '@dxos/types';

const FIXTURE = 'whistle-one-two-three';

const CHUNK_MS = 200;

/** Reads a 16-bit mono PCM WAV as the int16-scale samples `MediaStreamRecorder` produces. */
const readPcm16 = (file: string): { sampleRate: number; samples: Float64Array } => {
  const buffer = readFileSync(file);
  const sampleRate = buffer.readUInt32LE(24);
  let offset = 12;
  while (offset < buffer.length && buffer.toString('ascii', offset, offset + 4) !== 'data') {
    offset += 8 + buffer.readUInt32LE(offset + 4);
  }
  const length = buffer.readUInt32LE(offset + 4) / 2;
  const samples = new Float64Array(length);
  for (let index = 0; index < length; index++) {
    samples[index] = buffer.readInt16LE(offset + 8 + index * 2);
  }
  return { sampleRate, samples };
};

/** Plays a recording as the recorder's fixed-interval chunks, starting at `start`. */
class FileRecorder implements AudioRecorder {
  #onChunk?: (chunk: AudioChunk) => void;

  constructor(
    private readonly _sampleRate: number,
    private readonly _samples: Float64Array,
  ) {}

  get wavConfig() {
    return { channels: 1, sampleRate: this._sampleRate, bitDepthCode: '16' };
  }

  setOnChunk(onChunk: (chunk: AudioChunk) => void): void {
    this.#onChunk = onChunk;
  }

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  play(start: number): void {
    const size = (this._sampleRate * CHUNK_MS) / 1_000;
    for (let index = 0; index * size < this._samples.length; index++) {
      this.#onChunk?.({
        timestamp: start + index * CHUNK_MS,
        data: this._samples.slice(index * size, (index + 1) * size),
      });
    }
  }
}

describe.skipIf(!fixtureExists(FIXTURE, { extension: 'wav' }))('EDGE transcription service', () => {
  test(
    'transcribes a recorded utterance into timestamped segments',
    { tags: ['manual'], timeout: 60_000 },
    async ({ expect }) => {
      const file = fixturePath(FIXTURE, { extension: 'wav' });
      expect(file).toBeDefined();
      const { sampleRate, samples } = readPcm16(file ?? '');

      const config = new Config({
        runtime: { services: { edge: { url: process.env.DX_EDGE_URL ?? EDGE_URLS.dev } } },
      });
      const endpoint = getEdgeServiceEndpoint(config, EdgeServiceName.Transcription);
      const recorder = new FileRecorder(sampleRate, samples);
      const received: ContentBlock.Transcript[] = [];
      const transcriber = new Transcriber({
        config: { transcribeAfterChunksAmount: 1_000, prefixBufferChunksAmount: 10, endpoint },
        recorder,
        onSegments: async (segments) => {
          received.push(...segments);
        },
      });

      await transcriber.open();
      const start = Date.parse('2026-01-01T00:00:00.000Z');
      transcriber.startChunksRecording();
      recorder.play(start);
      await transcriber.flush();
      await transcriber.close();

      const text = received.map((segment) => segment.text).join(' ');
      expect(text.toLowerCase().replace(/[^a-z ]/g, '')).toContain('one two three');
      expect(Date.parse(received[0].started)).toBeGreaterThanOrEqual(start);
    },
  );
});
