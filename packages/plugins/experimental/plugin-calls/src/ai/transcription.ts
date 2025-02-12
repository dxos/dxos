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
  private document?: ReactiveEchoObject<DocumentType> = undefined;
  private recorder?: MediaRecorder = undefined;
  private header?: Uint8Array = undefined;
  private audioChunks: RecorderChunk[] = [];
  private lastSegEndTimestamp = 0;
  private identity?: UserState;
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
    this.recorder?.stop();
    this.recorder = undefined;
  }

  setAudioTrack(audioTrack: MediaStreamTrack) {
    this.recorder?.stop();
    this.recorder = new MediaRecorder(new MediaStream([audioTrack]));
    this._resetHandler();
  }

  setDocument(document: ReactiveEchoObject<DocumentType>) {
    invariant(this.recorder, 'Recorder not set');
    this.document = document;
    this._resetHandler();
  }

  setIdentity(identity: UserState) {
    this.identity = identity;
    this._resetHandler();
  }

  /**
   * Resets the ondataavailable event handler to the default. Needed to prevent staled references.
   */
  private _resetHandler() {
    this.recorder && (this.recorder.ondataavailable = (event) => this._ondataavailable(event));
  }

  startRecorder() {
    invariant(this.recorder, 'Recorder not set');
    if (this.recorder.state === 'recording') {
      log.verbose('Recorder already recording');
      return;
    }
    this.recorder.start(this.config.recordingInterval);
  }

  stopRecorder() {
    invariant(this.recorder, 'Recorder not set');
    this.recorder.stop();
    this.audioChunks = [];
    this.lastSegEndTimestamp = 0;
  }

  @synchronized
  private async _ondataavailable(event: BlobEvent) {
    try {
      await this._saveAudioBlob(event.data);
      invariant(this.document, 'No document');
      const chunksToUse = this.audioChunks;
      const audio = this._mergeAudioChunks(chunksToUse);
      const segments = await this._fetchTranscription(audio);
      this._updateDocument(segments, chunksToUse);
      this.audioChunks = chunksToUse.slice(-this.config.overlap);
    } catch (error) {
      log.error('Error in transcription', { error });
    }
  }

  private async _saveAudioBlob(blob: Blob) {
    const now = Date.now();
    if (!this.header && blob.size >= 181) {
      this.header = new Uint8Array((await blob.arrayBuffer()).slice(0, 181));
    }
    if (blob.size > 0) {
      this.audioChunks.push({ data: blob, timestamp: now });
    }
  }

  private _mergeAudioChunks(chunks: RecorderChunk[]) {
    return new Blob([this.header!, ...chunks.map(({ data }) => data)]);
  }

  private async _fetchTranscription(audio: Blob) {
    if (audio.size === 0) {
      this.audioChunks = [];
      throw new Error('No audio to send for transcribing');
    }

    log.verbose('Sending chunks to transcribe', { audio });
    const response = await fetch(`${CALLS_URL}/transcribe`, {
      method: 'POST',
      body: audio,
    });

    if (!response.ok) {
      this.audioChunks = [];
      throw new Error('Failed to transcribe');
    }

    const {
      segments,
    }: {
      segments: Segment[];
    } = await response.json();

    log.verbose('Transcription response', {
      segments,
      string: segments.map((segments) => segments.text).join(' '),
    });

    return segments;
  }

  private _updateDocument(segments: Segment[], originalChunks: RecorderChunk[]) {
    invariant(Array.isArray(segments), 'Invalid segments');

    const segsToUse = segments.filter(
      (segment) => segment.start * 1000 + originalChunks.at(0)!.timestamp > this.lastSegEndTimestamp,
    );

    this.lastSegEndTimestamp = (segsToUse.at(-1)?.end ?? 0) * 1000 + originalChunks.at(0)!.timestamp;
    const textToUse = segsToUse?.map((segment) => segment.text).join(' ') + '';
    log.info('>>> textToUse', { textToUse });
    if (textToUse.length === 0) {
      return;
    }

    const time = getTimeStr(originalChunks.at(0)!.timestamp);
    updateText(
      this.document!.content.target!,
      ['content'],
      this.document!.content.target!.content + `\n   _${time} ${this.identity!.name}_\n` + textToUse,
    );
  }
}
