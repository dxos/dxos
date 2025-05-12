//
// Copyright 2025 DXOS.org
//

import { synchronized } from '@dxos/async';
import { Resource } from '@dxos/context';
import { QueueImpl, type Queue } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
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

export type TranscriptMessageEnricher = (message: MessageType) => Promise<MessageType>;

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
  private _queue?: Queue<MessageType> = undefined;
  private _enabled = false;

  constructor(options: TranscriptionManagerOptions) {
    super();
    this._edgeClient = options.edgeClient;
    this._messageEnricher = options.messageEnricher;
  }

  protected override async _open() {
    await this._toggleTranscriber();
  }

  protected override async _close() {
    void this._transcriber?.close();
  }

  setQueue(queueDxn: DXN): TranscriptionManager {
    if (this._queue?.dxn.toString() !== queueDxn.toString()) {
      log.info('setQueue', { queueDxn: queueDxn.toString() });
      this._queue = new QueueImpl<MessageType>(this._edgeClient, queueDxn);
    }
    return this;
  }

  setIdentityDid(did: string): TranscriptionManager {
    if (this._identityDid !== did) {
      this._identityDid = did;
    }
    return this;
  }

  setRecording(recording?: boolean): TranscriptionManager {
    if (!this.isOpen || !this._enabled) {
      return this;
    }

    if (recording) {
      this._transcriber?.startChunksRecording();
    } else {
      this._transcriber?.stopChunksRecording();
    }
    return this;
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
    // TODO(burdon): Why is toggle called here?
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

  // TODO(burdon): Change this to setEnables (explicit), not toggle.
  private async _toggleTranscriber() {
    await this._maybeReinitTranscriber();

    // Open or close transcriber if transcription is enabled or disabled.
    if (this._enabled) {
      await this._transcriber?.open();
      // TODO(burdon): Started and stopped blocks appear twice.
      const block = create(MessageType, {
        created: new Date().toISOString(),
        blocks: [{ type: 'transcription', text: 'Started', started: new Date().toISOString() }],
        sender: { role: 'assistant' },
      });
      this._queue?.append([block]);
    } else {
      await this._transcriber?.close();
      const block = create(MessageType, {
        created: new Date().toISOString(),
        blocks: [{ type: 'transcription', text: 'Stopped', started: new Date().toISOString() }],
        sender: { role: 'assistant' },
      });
      this._queue?.append([block]);
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

    let block = create(MessageType, {
      created: new Date().toISOString(),
      blocks: segments,
      sender: { identityDid: this._identityDid },
    });

    if (this._messageEnricher) {
      block = await this._messageEnricher(block);
    }

    this._queue.append([block]);
  }
}
