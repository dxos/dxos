//
// Copyright 2025 DXOS.org
//
//
// Copyright 2025 DXOS.org
//

import { synchronized } from '@dxos/async';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type DocumentType } from '@dxos/plugin-markdown/types';
import { type ReactiveEchoObject, updateText } from '@dxos/react-client/echo';

import { CALLS_URL, type UserState } from '../types';
import { getTimeStr } from '../utils';

type Segment = {
  text: string;
  start: number;
  end: number;
  no_speech_prob: number;
};

type RecorderChunk = { data: Blob; timestamp: number };

export class Transcription extends Resource {
  private _document?: ReactiveEchoObject<DocumentType> = undefined;
  private _recorder?: MediaRecorder = undefined;
  private _header?: Uint8Array = undefined;
  private _audioChunks: RecorderChunk[] = [];
  private _lastSegEndTimestamp = 0;
  private _identity?: UserState;

  constructor(
    public readonly config: {
      /**
       * How much overlap between chunks.
       */
      recordingInterval: number;

      /**
       * How often to send the last `recordingLength` seconds of audio to the server.
       */
      overlap: number;
    },
  ) {
    super();
  }

  protected override async _close() {
    this._recorder?.stop();
    this._recorder = undefined;
  }

  setAudioTrack(audioTrack: MediaStreamTrack) {
    this._recorder?.stop();
    this._recorder = new MediaRecorder(new MediaStream([audioTrack]));
    this._resetHandler();
  }

  setDocument(document: ReactiveEchoObject<DocumentType>) {
    invariant(this._recorder, 'Recorder not set');
    this._document = document;
    this._resetHandler();
  }

  setIdentity(identity: UserState) {
    this._identity = identity;
    this._resetHandler();
  }

  /**
   * Resets the ondataavailable event handler to the default. Needed to prevent staled references.
   */
  private _resetHandler() {
    this._recorder && (this._recorder.ondataavailable = (event) => this._ondataavailable(event));
  }

  startRecorder() {
    invariant(this._recorder, 'Recorder not set');
    if (this._recorder.state === 'recording') {
      log.verbose('Recorder already recording');
      return;
    }
    this._recorder.start(this.config.recordingInterval);
  }

  stopRecorder() {
    invariant(this._recorder, 'Recorder not set');
    this._recorder.stop();
  }

  @synchronized
  private async _ondataavailable(event: BlobEvent) {
    try {
      log.info('>>> transcription._ondataavailable', { event });
      await this._saveAudioBlob(event.data);
      invariant(this._document, 'No document');
      const chunksToUse = this._audioChunks;
      const audio = this._mergeAudioChunks(chunksToUse);
      const segments = await this._fetchTranscription(audio);
      this._updateDocument(segments, chunksToUse);
      this._audioChunks = this.config.overlap > 0 ? chunksToUse.slice(-this.config.overlap) : [];
    } catch (error) {
      log.error('Error in transcription', { error });
    }
  }

  private async _saveAudioBlob(blob: Blob) {
    const now = Date.now();
    if (!this._header && blob.size >= 181) {
      this._header = new Uint8Array((await blob.arrayBuffer()).slice(0, 181));
    }
    if (blob.size > 0) {
      this._audioChunks.push({ data: blob, timestamp: now });
    }
  }

  private _mergeAudioChunks(chunks: RecorderChunk[]) {
    return new Blob([this._header!, ...chunks.map(({ data }) => data)]);
  }

  private async _fetchTranscription(audio: Blob) {
    if (audio.size === 0) {
      this._audioChunks = [];
      throw new Error('No audio to send for transcribing');
    }

    log.verbose('Sending chunks to transcribe', { audio });
    const response = await fetch(`${CALLS_URL}/transcribe`, {
      method: 'POST',
      body: audio,
    });

    if (!response.ok) {
      this._audioChunks = [];
      throw new Error('Failed to transcribe');
    }

    const {
      segments,
    }: {
      segments: Segment[];
    } = await response.json();

    log.info('Transcription response', {
      segments,
      string: segments.map((segments) => segments.text).join(' '),
    });

    return segments;
  }

  private _updateDocument(segments: Segment[], originalChunks: RecorderChunk[]) {
    invariant(Array.isArray(segments), 'Invalid segments');

    log.info('Updating document', {
      segments,
      originalStart: originalChunks.at(0)!.timestamp,
      lastSegEndTimestamp: this._lastSegEndTimestamp,
    });
    const segsToUse = segments.filter(
      (segment) => segment.start * 1000 + originalChunks.at(0)!.timestamp > this._lastSegEndTimestamp,
    );

    this._lastSegEndTimestamp = (segsToUse.at(-1)?.end ?? 0) * 1000 + originalChunks.at(0)!.timestamp;
    const textToUse = segsToUse?.map((segment) => segment.text).join(' ') + '';
    log.info('>>> textToUse', { textToUse });
    if (textToUse.length === 0) {
      return;
    }

    const time = getTimeStr(originalChunks.at(0)!.timestamp);
    updateText(
      this._document!.content.target!,
      ['content'],
      this._document!.content.target!.content + `\n   _${time} ${this._identity!.name}_\n` + textToUse,
    );
  }
}
