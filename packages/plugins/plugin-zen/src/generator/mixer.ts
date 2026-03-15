//
// Copyright 2026 DXOS.org
//

import type { Sequence } from '../types/Sequence';

import { BinauralGenerator } from './binaural-generator';
import { SamplePlayer } from './player';

type LayerSource = BinauralGenerator | SamplePlayer;

export type MixerState = {
  playing: boolean;
  outputNode: AudioNode | undefined;
};

export type MixerStateCallback = (state: MixerState) => void;

export type MixerEngineOptions = {
  onStateChange?: MixerStateCallback;
};

/** Manages playback of multiple audio layers through a shared AudioContext. */
export class MixerEngine {
  private _context: AudioContext | undefined;
  private _masterGain: GainNode | undefined;
  private _sources = new Map<string, LayerSource>();
  private _playing = false;
  private _onStateChange: MixerStateCallback | undefined;

  constructor(options?: MixerEngineOptions) {
    this._onStateChange = options?.onStateChange;
  }

  get playing(): boolean {
    return this._playing;
  }

  /** Master output node for visualization. */
  get outputNode(): AudioNode | undefined {
    return this._masterGain;
  }

  /** Register a callback for state changes. */
  set onStateChange(callback: MixerStateCallback | undefined) {
    this._onStateChange = callback;
  }

  private _emitState(): void {
    this._onStateChange?.({ playing: this._playing, outputNode: this._masterGain });
  }

  /** Start all non-muted layers. */
  async play(sequences: Sequence[]): Promise<void> {
    await this.stop();

    this._context = new AudioContext();
    this._masterGain = this._context.createGain();
    this._masterGain.connect(this._context.destination);

    for (const sequence of sequences) {
      const source = this._createSource(sequence);
      if (source) {
        this._sources.set(sequence.id, source);
        if (!sequence.muted) {
          await source.start();
        }
      }
    }

    this._playing = true;
    this._emitState();
  }

  /** Stop all layers and release resources. */
  async stop(): Promise<void> {
    const stops = Array.from(this._sources.values()).map((source) => source.stop());
    await Promise.all(stops);
    this._sources.clear();

    this._masterGain?.disconnect();
    this._masterGain = undefined;
    if (this._context) {
      await this._context.close();
      this._context = undefined;
    }

    this._playing = false;
    this._emitState();
  }

  /** Remove and stop a single layer. */
  async removeLayer(id: string): Promise<void> {
    const existing = this._sources.get(id);
    if (existing) {
      await existing.stop();
      this._sources.delete(id);
    }
  }

  /** Restart a single layer with updated configuration. */
  async updateLayer(sequence: Sequence): Promise<void> {
    const existing = this._sources.get(sequence.id);
    if (existing) {
      await existing.stop();
      this._sources.delete(sequence.id);
    }

    if (!this._context || !this._masterGain) {
      return;
    }

    const source = this._createSource(sequence);
    if (source) {
      this._sources.set(sequence.id, source);
      if (!sequence.muted) {
        await source.start();
      }
    }
  }

  private _createSource(sequence: Sequence): LayerSource | undefined {
    if (!this._context || !this._masterGain) {
      return undefined;
    }

    const { source } = sequence;
    if (source.type === 'generator') {
      return new BinauralGenerator(this._context, this._masterGain, {
        ...source,
        volume: sequence.muted ? 0 : sequence.volume,
      });
    } else if (source.type === 'sample') {
      const player = new SamplePlayer(this._context, this._masterGain, source.sample, sequence.volume);
      player.muted = sequence.muted;
      return player;
    }

    return undefined;
  }
}
