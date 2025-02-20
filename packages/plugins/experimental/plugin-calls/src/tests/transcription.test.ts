//
// Copyright 2025 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { WaveFile } from 'wavefile';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { trace, TRACE_PROCESSOR } from '@dxos/tracing';

import { type AudioChunk, AudioRecorder, type TranscribedText, Transcription } from '../ai';
import { mergeFloat64Arrays } from '../utils';

describe('transcription', () => {
  const DIR_PATH = path.join(__dirname, 'audio');

  const readFile = async (filename: string) => {
    return fs.readFileSync(path.join(DIR_PATH, filename));
  };

  const writeOutputFile = async (filename: string, data: Uint8Array) => {
    const outputPath = path.join(DIR_PATH, 'out', filename);
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    return fs.writeFileSync(outputPath, data);
  };

  test('split wav file', async () => {
    // Read the WAV file
    const fileBuffer = await readFile('test.wav');
    const wav = new WaveFile(fileBuffer);

    // Get PCM samples and format info
    const samples = wav.getSamples();
    const format = wav.fmt as any;

    // Take second half of samples
    const halfSamples = samples.slice(Math.floor(samples.length / 2));

    // Create new WAV file with half the samples
    const halfWav = new WaveFile();
    halfWav.fromScratch(1, format.sampleRate!, '16', halfSamples);

    // Save the half-length file
    await writeOutputFile('half.wav', halfWav.toBuffer());
  });

  test('merge audio chunks', async () => {
    const chunks: AudioChunk[] = [];
    const trigger = new Trigger({ autoReset: true });

    const reader = new MockAudioRecorder(
      (chunk) => {
        chunks.push(chunk);
        trigger.wake();
      },
      await readFile('test.wav'),
      3_000,
    );

    await reader.start();

    const chunksNumber = 3;
    for (let i = 0; i < chunksNumber; i++) {
      reader.emitChunk();
    }

    while (chunks.length < chunksNumber) {
      await trigger.wait();
    }

    const wav = new WaveFile();
    wav.fromScratch(
      1, //
      reader.sampleRate,
      '16',
      mergeFloat64Arrays(chunks.map((chunk) => chunk.data)),
    );
    await writeOutputFile('merged.wav', wav.toBuffer());

    await reader.stop();
  });

  test('transcription of audio recording', { timeout: 10_000 }, async () => {
    const trigger = new Trigger<TranscribedText>({ autoReset: true });
    const transcription = new Transcription(
      async (transcription) => {
        log.info('transcription', { transcription });
        trigger.wake(transcription);
      },
      {
        prefixedChunksAmount: 1,
        sampleRate: 24000,
      },
    );

    const recorder = new MockAudioRecorder(
      (chunk) => transcription.onChunk(chunk), //
      await readFile('test.wav'),
      3_000,
    );
    await recorder.start();

    transcription.startChunksRecording();

    recorder.emitChunk();
    recorder.emitChunk();
    recorder.emitChunk();

    transcription.stopChunksRecording();
    // Could fail, not critical.
    expect((await trigger.wait()).text.includes('I will tell you some information about myself'));
  });

  test('transcription of audio recording with overlapping chunks', { timeout: 20_000 }, async () => {
    const trigger = new Trigger<TranscribedText>({ autoReset: true });
    const transcription = new Transcription(
      async (transcription) => {
        trigger.wake(transcription);
      },
      {
        prefixedChunksAmount: 1,
      },
    );

    const recorder = new MockAudioRecorder(
      (chunk) => transcription.onChunk(chunk), //
      await readFile('test.wav'),
      3_000,
    );

    transcription.setSampleRate(recorder.sampleRate);

    await recorder.start();

    transcription.startChunksRecording();
    recorder.emitChunk();
    recorder.emitChunk();
    transcription.stopChunksRecording();
    expect((await trigger.wait()).text.includes("Hello, I'm"));

    transcription.startChunksRecording();
    recorder.emitChunk();
    recorder.emitChunk();
    transcription.stopChunksRecording();
    expect((await trigger.wait()).text.includes('I will tell you some information about myself'));

    log.info('Done', { trace: TRACE_PROCESSOR.getDiagnostics() });
  });
});

@trace.resource()
class MockAudioRecorder extends AudioRecorder {
  private readonly _chunks: AudioChunk[] = [];
  private readonly _wav: WaveFile;

  constructor(
    onChunk: (chunk: AudioChunk) => void,
    private readonly _buffer: Uint8Array,
    /**
     * The duration of each chunk in milliseconds.
     */
    private readonly _chunkDuration: number,
  ) {
    super(onChunk);
    this._wav = new WaveFile(this._buffer);
  }

  get sampleRate() {
    return (this._wav.fmt as any).sampleRate;
  }

  /**
   * Emit a chunk in controlled manner for testing purposes.
   */
  emitChunk() {
    const chunk = this._chunks.shift();
    if (!chunk) {
      return;
    }

    this._onChunk(chunk);
  }

  @trace.span()
  async start() {
    log.info('start mock audio recorder', { wavParams: this._wav.fmt });
    const now = Date.now();
    const samples = this._wav.getSamples();
    const increment = this.sampleRate * (this._chunkDuration / 1000);
    for (let i = 0; i < samples.length; i += increment) {
      const chunk = samples.slice(i, i + increment);
      this._chunks.push({
        timestamp: now + (i / increment) * this._chunkDuration,
        data: chunk,
      });
    }
  }

  async stop() {}
}
