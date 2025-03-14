//
// Copyright 2025 DXOS.org
//

import { synchronized } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type Queue, QueueImpl } from '@dxos/echo-db';
import { createStatic } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { MediaStreamRecorder, Transcriber } from '@dxos/plugin-transcription';
import { TranscriptBlock, type TranscriptSegment } from '@dxos/plugin-transcription/types';
import { type EdgeHttpClient } from '@dxos/react-edge-client';

import { type TranscriptionState } from '../types';

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

export class TranscriptionManager extends Resource {
  private readonly _edgeClient: EdgeHttpClient;
  private _audioStreamTrack?: MediaStreamTrack = undefined;
  private _name?: string = undefined;
  private _mediaRecorder?: MediaStreamRecorder = undefined;
  private _transcriber?: Transcriber = undefined;
  private _transcriptionState?: TranscriptionState = undefined;
  private _queue?: Queue<TranscriptBlock> = undefined;

  constructor(edgeClient: EdgeHttpClient) {
    super();
    this._edgeClient = edgeClient;
  }

  protected override async _open() {
    await this._toggleTranscriber();
  }

  protected override async _close() {
    void this._transcriber?.close();
  }

  setSpeaking(speaking: boolean) {
    if (!this.isOpen || !this._transcriptionState?.enabled) {
      return;
    }

    if (speaking) {
      this._transcriber?.startChunksRecording();
    } else {
      this._transcriber?.stopChunksRecording();
    }
  }

  @synchronized
  async setTranscription(transcription?: TranscriptionState) {
    if (
      !transcription ||
      (this._transcriptionState?.enabled === transcription.enabled &&
        this._transcriptionState?.queueDxn === transcription.queueDxn)
    ) {
      return;
    }

    this._transcriptionState = transcription;
    this.isOpen && (await this._toggleTranscriber());
  }

  @synchronized
  async setAudioTrack(track?: MediaStreamTrack) {
    if (this._audioStreamTrack === track) {
      return;
    }
    this._audioStreamTrack = track;
    this.isOpen && (await this._toggleTranscriber());
  }

  @synchronized
  setName(name: string) {
    if (this._name === name) {
      return;
    }
    this._name = name;
  }

  private async _toggleTranscriber() {
    if (!this._audioStreamTrack || !this._transcriptionState?.enabled || !this._transcriptionState.queueDxn) {
      return;
    }

    // Reinitialize transcriber if queue or media stream track has changed.
    let needReinit = false;
    if (this._queue?.dxn.toString() !== this._transcriptionState.queueDxn) {
      this._queue = new QueueImpl(this._edgeClient, DXN.parse(this._transcriptionState.queueDxn));
      needReinit = true;
    }
    if (this._audioStreamTrack !== this._mediaRecorder?.mediaStreamTrack) {
      this._mediaRecorder = new MediaStreamRecorder({
        mediaStreamTrack: this._audioStreamTrack,
        interval: RECORD_INTERVAL,
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
    }

    // Open or close transcriber if transcription is enabled or disabled.
    if (this._transcriptionState?.enabled) {
      await this._transcriber?.open();
    } else {
      await this._transcriber?.close();
    }
  }

  private async _onSegments(segments: TranscriptSegment[]) {
    if (!this.isOpen || !this._queue) {
      return;
    }

    const block = createStatic(TranscriptBlock, { author: this._name, segments });
    this._queue.append([block]);
  }
}
