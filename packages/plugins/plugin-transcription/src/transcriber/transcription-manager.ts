//
// Copyright 2025 DXOS.org
//

import { synchronized } from '@dxos/async';
import { Resource } from '@dxos/context';
import { QueueImpl, type Queue } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { type EdgeHttpClient } from '@dxos/react-edge-client';
import { MessageType, type TranscriptionContentBlock } from '@dxos/schema';

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

/**
 * Manages transcription state for a meeting.
 */
// TODO(mykola): Reconcile with transcriber capability.
export class TranscriptionManager extends Resource {
  private readonly _edgeClient: EdgeHttpClient;
  private _audioStreamTrack?: MediaStreamTrack = undefined;
  private _identityDid?: string = undefined;
  private _mediaRecorder?: MediaStreamRecorder = undefined;
  private _transcriber?: Transcriber = undefined;
  private _enabled = false;
  private _queue?: Queue<MessageType> = undefined;

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

  @synchronized
  setRecording(recording?: boolean) {
    if (!this.isOpen || !this._enabled) {
      return;
    }

    if (recording) {
      this._transcriber?.startChunksRecording();
    } else {
      this._transcriber?.stopChunksRecording();
    }
  }

  /**
   * Enable or disable transcription.
   * @param enabled - Whether to enable transcription.
   */
  @synchronized
  async setEnabled(enabled?: boolean) {
    if (this._enabled === enabled) {
      return;
    }
    this._enabled = enabled ?? false;
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

  /**
   * Set the queue to save the transcription to.
   * @param queue - The queue to save the transcription to or the DXN of the queue.
   */
  @synchronized
  setQueue(queue?: Queue<MessageType> | string) {
    switch (typeof queue) {
      case 'string':
        if (this._queue?.dxn.toString() === queue) {
          return;
        }
        this._queue = new QueueImpl<MessageType>(this._edgeClient, DXN.parse(queue));
        break;
      case 'object':
        if (this._queue === queue) {
          return;
        }
        invariant(queue instanceof QueueImpl);
        this._queue = queue;
        break;
      case 'undefined':
        this._queue = undefined;
        break;
    }
  }

  @synchronized
  setIdentityDid(did: string) {
    if (this._identityDid === did) {
      return;
    }
    this._identityDid = did;
  }

  private async _toggleTranscriber() {
    await this._maybeReinitTranscriber();

    // Open or close transcriber if transcription is enabled or disabled.
    if (this._enabled) {
      await this._transcriber?.open();
    } else {
      await this._transcriber?.close();
    }
  }

  private async _maybeReinitTranscriber() {
    if (!this._audioStreamTrack || !this._enabled) {
      return;
    }

    // Reinitialize transcriber if queue or media stream track has changed.
    let needReinit = false;
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
  }

  private async _onSegments(segments: TranscriptionContentBlock[]) {
    if (!this.isOpen || !this._queue) {
      return;
    }

    const block = create(MessageType, {
      created: new Date().toISOString(),
      blocks: segments,
      sender: { identityDid: this._identityDid },
    });
    this._queue.append([block]);
  }
}
