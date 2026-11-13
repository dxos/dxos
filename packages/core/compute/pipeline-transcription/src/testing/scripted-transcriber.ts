//
// Copyright 2026 DXOS.org
//

import { sleep } from '@dxos/async';
import { type ContentBlock } from '@dxos/types';

import { type CreateTranscriber, type Transcriber, type TranscriberCallbacks } from '../asr/index.ts';
import { type ScriptedBlock } from './scripted-source.ts';

export type ScriptedTranscriberOptions = {
  /** Segments delivered in order, one per {@link ScriptedTranscriberOptions.intervalMs}, while started. */
  readonly segments: readonly ScriptedBlock[];
  /** Pause before each segment, standing in for the time it took to say. Default: 1000. */
  readonly intervalMs?: number;
};

/**
 * A {@link Transcriber} that speaks a fixed script instead of listening: no microphone, network or service, so a
 * pipeline, a story or a test can run transcription offline and deterministically.
 */
export const createScriptedTranscriber =
  ({ segments, intervalMs = 1_000 }: ScriptedTranscriberOptions): CreateTranscriber =>
  (callbacks) =>
    new ScriptedTranscriber(segments, intervalMs, callbacks);

class ScriptedTranscriber implements Transcriber {
  #next = 0;
  #running = false;
  #playing: Promise<void> = Promise.resolve();

  constructor(
    private readonly _segments: readonly ScriptedBlock[],
    private readonly _intervalMs: number,
    private readonly _callbacks: TranscriberCallbacks,
  ) {}

  async open(): Promise<void> {}

  async close(): Promise<void> {
    this.#running = false;
  }

  start(): void {
    if (this.#running) {
      return;
    }
    this.#running = true;
    this.#playing = this.#play();
  }

  stop(): void {
    this.#running = false;
  }

  async flush(): Promise<void> {
    this.#running = false;
    await this.#playing;
  }

  abort(): void {
    this.#running = false;
  }

  async #play(): Promise<void> {
    while (this.#running && this.#next < this._segments.length) {
      await sleep(this._intervalMs);
      if (!this.#running) {
        return;
      }
      const block = this._segments[this.#next++];
      const segment: ContentBlock.Transcript = {
        _tag: 'transcript',
        started: block.started ?? new Date().toISOString(),
        text: block.text,
      };
      await this._callbacks.onSegments([segment]);
    }
  }
}
