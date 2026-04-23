//
// Copyright 2026 DXOS.org
//

import { SAMPLE_URLS } from './sounds';

/**
 * Audio player for bundled m4a samples.
 * Routes audio through a shared AudioContext for mixing and visualization.
 */
export class SamplePlayer {
  private _context: AudioContext;
  private _destination: AudioNode;
  private _audio: HTMLAudioElement | undefined;
  private _sourceNode: MediaElementAudioSourceNode | undefined;
  private _gainNode: GainNode | undefined;
  private _playing = false;
  private _volume: number;
  private _muted = false;
  private _sample: string;

  constructor(context: AudioContext, destination: AudioNode, sample: string, volume = 0.5) {
    this._context = context;
    this._destination = destination;
    this._sample = sample;
    this._volume = volume;
  }

  get playing(): boolean {
    return this._playing;
  }

  get sample(): string {
    return this._sample;
  }

  set volume(value: number) {
    this._volume = value;
    if (this._gainNode) {
      this._gainNode.gain.setTargetAtTime(this._muted ? 0 : value, this._context.currentTime, 0.05);
    }
  }

  set muted(value: boolean) {
    this._muted = value;
    if (this._gainNode) {
      this._gainNode.gain.setTargetAtTime(this._muted ? 0 : this._volume, this._context.currentTime, 0.05);
    }
  }

  /** Start playing the sample in a loop. */
  async start(): Promise<void> {
    if (this._playing) {
      return;
    }

    const url = SAMPLE_URLS[this._sample];
    this._audio = new Audio(url);
    this._audio.crossOrigin = 'anonymous';
    this._audio.loop = true;

    // Route through Web Audio API for shared context.
    this._sourceNode = this._context.createMediaElementSource(this._audio);
    this._gainNode = this._context.createGain();
    this._gainNode.gain.value = this._muted ? 0 : this._volume;
    this._sourceNode.connect(this._gainNode);
    this._gainNode.connect(this._destination);

    try {
      await this._audio.play();
      this._playing = true;
    } catch {
      // Clean up partial graph on failure.
      this._gainNode?.disconnect();
      this._sourceNode?.disconnect();
      this._audio = undefined;
      this._sourceNode = undefined;
      this._gainNode = undefined;
    }
  }

  /** Stop playback and release resources. */
  async stop(): Promise<void> {
    if (!this._playing || !this._audio) {
      return;
    }

    this._audio.pause();
    this._audio.src = '';
    this._gainNode?.disconnect();
    this._sourceNode?.disconnect();
    this._audio = undefined;
    this._sourceNode = undefined;
    this._gainNode = undefined;
    this._playing = false;
  }
}
