//
// Copyright 2025 DXOS.org
//

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
  private _transcriber?: Transcriber = undefined;
  private _audioStreamTrack?: MediaStreamTrack = undefined;
  private _transcriptionState?: TranscriptionState = undefined;
  private _queue?: Queue<TranscriptBlock> = undefined;

  constructor(edgeClient: EdgeHttpClient) {
    super();
    this._edgeClient = edgeClient;
  }

  protected override async _close() {
    void this._transcriber?.close();
  }

  setSpeaking(speaking: boolean) {
    if (!this._transcriptionState?.enabled) {
      return;
    }

    if (speaking) {
      void this._transcriber?.startChunksRecording();
    } else {
      void this._transcriber?.stopChunksRecording();
    }
  }

  setTranscription(transcription?: TranscriptionState) {
    if (
      !transcription ||
      (this._transcriptionState?.enabled === transcription.enabled &&
        this._transcriptionState?.queueDxn === transcription.queueDxn)
    ) {
      return;
    }

    if (transcription.queueDxn && this._transcriptionState?.queueDxn !== transcription.queueDxn) {
      this._queue = new QueueImpl(this._edgeClient, DXN.parse(transcription.queueDxn));
      this._maybeInitTranscriber();
    }

    if (transcription.enabled) {
      void this._transcriber?.open();
    } else {
      void this._transcriber?.close();
    }

    this._transcriptionState = transcription;
  }

  setAudioTrack(track?: MediaStreamTrack) {
    if (this._audioStreamTrack === track) {
      return;
    }
    this._audioStreamTrack = track;
    this._maybeInitTranscriber();
  }

  private _maybeInitTranscriber() {
    if (!this._audioStreamTrack || !this._queue) {
      return;
    }

    void this._transcriber?.close();
    this._transcriber = new Transcriber({
      config: {
        transcribeAfterChunksAmount: TRANSCRIBE_AFTER_CHUNKS_AMOUNT,
        prefixBufferChunksAmount: PREFIXED_CHUNKS_AMOUNT,
      },
      recorder: new MediaStreamRecorder({
        mediaStreamTrack: this._audioStreamTrack,
        interval: RECORD_INTERVAL,
      }),
      onSegments: (segments) => this._onSegments(segments),
    });
  }

  private async _onSegments(segments: TranscriptSegment[]) {
    if (!this._queue) {
      return;
    }

    const block = createStatic(TranscriptBlock, { author: self.name, segments });
    this._queue.append([block]);
  }
}
