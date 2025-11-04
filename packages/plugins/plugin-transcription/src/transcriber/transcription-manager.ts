//
// Copyright 2025 DXOS.org
//

import { signal } from '@preact/signals-core';

import { synchronized } from '@dxos/async';
import { Resource } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { type EdgeHttpClient } from '@dxos/react-edge-client';
import { DataType } from '@dxos/schema';

import { MediaStreamRecorder } from './media-stream-recorder';
import { Transcriber } from './transcriber';

/**
 * Length of the chunk in ms.
 */
const RECORD_INTERVAL = 200;

/**
 * Number of chunks to save before the user starts speaking.
 */
const PREFIXED_CHUNKS_AMOUNT = 10;

/**
 * Number of chunks to transcribe automatically after.
 * Combined should be mess than 25MB or whisper would fail.
 */
const TRANSCRIBE_AFTER_CHUNKS_AMOUNT = 50;

export type TranscriptMessageEnricher = (message: DataType.Message) => Promise<DataType.Message>;

export type TranscriptionManagerOptions = {
  edgeClient: EdgeHttpClient;

  /**
   * Enrich the message before it is written to the transcription queue.
   */
  messageEnricher?: TranscriptMessageEnricher;
};

/**
 * Manages transcription state for a meeting.
 */
export class TranscriptionManager extends Resource {
  private readonly _edgeClient: EdgeHttpClient;
  private readonly _messageEnricher?: TranscriptMessageEnricher;
  private _audioStreamTrack?: MediaStreamTrack = undefined;
  private _identityDid?: string = undefined;
  private _mediaRecorder?: MediaStreamRecorder = undefined;
  private _transcriber?: Transcriber = undefined;
  private _queue?: Queue<DataType.Message> = undefined;
  private _enabled = signal(false);

  constructor(options: TranscriptionManagerOptions) {
    super();
    this._edgeClient = options.edgeClient;
    this._messageEnricher = options.messageEnricher;
  }

  /** @reactive */
  get enabled() {
    return this._enabled.value;
  }

  setQueue(queue: Queue<DataType.Message>): this {
    this._queue = queue;
    return this;
  }

  setIdentityDid(did: string): this {
    if (this._identityDid !== did) {
      this._identityDid = did;
    }
    return this;
  }

  setRecording(recording?: boolean): this {
    if (!this.isOpen || !this._enabled.value) {
      return this;
    }

    if (recording) {
      this._transcriber?.startChunksRecording();
    } else {
      this._transcriber?.stopChunksRecording();
    }
    return this;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (this._enabled.value === enabled) {
      return;
    }

    this._enabled.value = enabled ?? false;
    if (enabled) {
      await this._maybeRestartTranscriber();
    } else {
      await this._stopTranscriber();
    }
  }

  @synchronized
  async setAudioTrack(track?: MediaStreamTrack): Promise<void> {
    if (this._audioStreamTrack === track) {
      return;
    }

    this._audioStreamTrack = track;
    await this._maybeRestartTranscriber();
  }

  protected override async _open(): Promise<void> {
    await this._maybeRestartTranscriber();
  }

  protected override async _close(): Promise<void> {
    await this._stopTranscriber();
  }

  private async _maybeRestartTranscriber(): Promise<void> {
    if (!this._audioStreamTrack || !this._enabled.value || !this.isOpen) {
      return;
    }

    // Reinitialize transcriber if queue or media stream track has changed.
    let needReinit = false;
    if (this._audioStreamTrack !== this._mediaRecorder?.mediaStreamTrack) {
      this._mediaRecorder = new MediaStreamRecorder({
        mediaStreamTrack: this._audioStreamTrack,
        config: { interval: RECORD_INTERVAL },
      });
      needReinit = true;
    }
    if (needReinit) {
      await this._transcriber?.close();
      this._transcriber = new Transcriber({
        config: {
          transcribeAfterChunksAmount: TRANSCRIBE_AFTER_CHUNKS_AMOUNT,
          prefixBufferChunksAmount: PREFIXED_CHUNKS_AMOUNT,
        },
        recorder: this._mediaRecorder,
        onSegments: (segments) => this._onSegments(segments),
      });

      await this._transcriber?.open();
    }
  }

  private async _stopTranscriber(): Promise<void> {
    await this._transcriber?.close();
  }

  private async _onSegments(segments: DataType.ContentBlock.Transcript[]): Promise<void> {
    if (!this.isOpen || !this._queue) {
      return;
    }

    let block = Obj.make(DataType.Message, {
      created: new Date().toISOString(),
      blocks: segments,
      sender: { identityDid: this._identityDid },
    });

    if (this._messageEnricher) {
      block = await this._messageEnricher(block);
    }

    await this._queue.append([block]);
  }
}
