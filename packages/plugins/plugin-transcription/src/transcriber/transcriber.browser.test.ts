//
// Copyright 2025 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';
import { WaveFile } from 'wavefile';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { openAndClose } from '@dxos/test-utils';
import { TRACE_PROCESSOR, trace } from '@dxos/tracing';
import { type Message } from '@dxos/types';

import { type AudioChunk, type AudioRecorder, Transcriber } from '../transcriber';
import { mergeFloat64Arrays } from '../util';

// TODO(burdon): ReferenceError: Worker is not defined (Can only run with web workers).

// This is a playground for testing the transcription, requires `calls-service` to be running.
describe.skip('Transcriber', () => {
  const DIR_PATH = path.join(__dirname, 'assets');

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

  test.skip('split wav file', async () => {
    // Read the WAV file
    const fileBuffer = await readFile('./testing/test.wav');
    const wav = new WaveFile(fileBuffer);

    // Get PCM samples and format info.
    const samples = wav.getSamples();
    const format = wav.fmt as any;

    // Take second half of samples.
    const halfSamples = samples.slice(Math.floor(samples.length / 2));

    // Create new WAV file with half the samples.
    const halfWav = new WaveFile();
    halfWav.fromScratch(1, format.sampleRate!, '16', halfSamples);

    // Save the half-length file
    await writeOutputFile('half.wav', halfWav.toBuffer());
  });

  test.skip('merge audio chunks', async () => {
    const chunks: AudioChunk[] = [];
    const trigger = new Trigger({ autoReset: true });

    const recorder = new MockAudioRecorder({
      buffer: await readFile('test.wav'),
      chunkDuration: 3_000,
    });

    recorder.setOnChunk((chunk) => {
      chunks.push(chunk);
      trigger.wake();
    });

    await recorder.start();

    const chunksNumber = 3;
    for (let i = 0; i < chunksNumber; i++) {
      recorder.emitChunk();
    }

    while (chunks.length < chunksNumber) {
      await trigger.wait();
    }

    const wav = new WaveFile();
    wav.fromScratch(
      1, //
      recorder.wavConfig.sampleRate,
      '16',
      mergeFloat64Arrays(chunks.map((chunk) => chunk.data)),
    );
    await writeOutputFile('merged.wav', wav.toBuffer());

    await recorder.stop();
  });

  test.skip('transcription of audio recording', { timeout: 10_000 }, async () => {
    const trigger = new Trigger<Message.ContentBlock.Transcript[]>({ autoReset: true });
    const recorder = new MockAudioRecorder({
      buffer: await readFile('test.wav'),
      chunkDuration: 3_000,
    });
    const transcription = new Transcriber({
      recorder,
      onSegments: async (segments) => {
        log.info('transcription', { segments });
        trigger.wake(segments);
      },
      config: {
        transcribeAfterChunksAmount: 1000,
        prefixBufferChunksAmount: 1,
      },
    });

    await openAndClose(transcription);

    transcription.startChunksRecording();

    recorder.emitChunk();
    recorder.emitChunk();
    recorder.emitChunk();

    transcription.stopChunksRecording();

    // Could fail, not critical.
    expect(
      (await trigger.wait()).some((segment) => segment.text.includes('I will tell you some information about myself')),
    );
  });

  test.skip('transcription of audio recording with overlapping chunks', { timeout: 20_000 }, async () => {
    const trigger = new Trigger<Message.ContentBlock.Transcript[]>({ autoReset: true });
    const recorder = new MockAudioRecorder({
      buffer: await readFile('test.wav'),
      chunkDuration: 3_000,
    });
    const transcription = new Transcriber({
      recorder,
      onSegments: async (segments) => {
        log.info('transcription', { segments });
        trigger.wake(segments);
      },
      config: {
        transcribeAfterChunksAmount: 1000,
        prefixBufferChunksAmount: 1,
      },
    });

    await openAndClose(transcription);

    transcription.startChunksRecording();
    recorder.emitChunk();
    recorder.emitChunk();
    transcription.stopChunksRecording();
    expect((await trigger.wait()).some((segment) => segment.text.includes("Hello, I'm")));

    transcription.startChunksRecording();
    recorder.emitChunk();
    recorder.emitChunk();
    transcription.stopChunksRecording();
    expect(
      (await trigger.wait()).some((segment) => segment.text.includes('I will tell you some information about myself')),
    );

    log.info('Done', { trace: TRACE_PROCESSOR.getDiagnostics() });
  });

  test.skip('double file', async () => {
    const fileBuffer = await readFile('test.wav');
    const wav = new WaveFile(fileBuffer);
    const samples = wav.getSamples();
    const newWav = new WaveFile();
    newWav.fromScratch(1, 24000, '16', mergeFloat64Arrays([samples, samples]));
    await writeOutputFile('double.wav', newWav.toBuffer());
  });
});

@trace.resource()
class MockAudioRecorder implements AudioRecorder {
  public chunks: AudioChunk[] = [];
  public wav: WaveFile;
  public chunkDuration: number;

  private _onChunk?: (chunk: AudioChunk) => void = undefined;

  constructor({ buffer, chunkDuration }: { buffer: Uint8Array; chunkDuration: number }) {
    this.wav = new WaveFile(buffer);
    this.chunkDuration = chunkDuration;
  }

  get wavConfig() {
    return {
      channels: 1,
      sampleRate: (this.wav.fmt as any).sampleRate,
      bitDepthCode: '16',
    };
  }

  setOnChunk(onChunk: (chunk: AudioChunk) => void): void {
    this._onChunk = onChunk;
  }

  /**
   * Emit a chunk in controlled manner for testing purposes.
   */
  emitChunk(): void {
    const chunk = this.chunks.shift();
    if (!chunk) {
      return;
    }

    this._onChunk!(chunk);
  }

  @trace.span()
  async start(): Promise<void> {
    log.info('start mock audio recorder', { wavParams: this.wav.fmt });
    const now = Date.now();
    const samples = this.wav.getSamples();
    const sampleRate = this.wavConfig.sampleRate;
    const increment = sampleRate * (this.chunkDuration / 1000);
    for (let i = 0; i < samples.length; i += increment) {
      const chunk = samples.slice(i, i + increment);
      this.chunks.push({
        timestamp: now + (i / increment) * this.chunkDuration,
        data: chunk,
      });
    }
  }

  async stop(): Promise<void> {}
}
