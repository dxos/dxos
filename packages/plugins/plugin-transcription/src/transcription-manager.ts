//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { synchronized } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { Database, Feed, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Transcriber } from '@dxos/pipeline-transcription';
import { MediaStreamRecorder } from '@dxos/react-ui-transcription';
import { type ContentBlock, Message } from '@dxos/types';

import { TranscriptionCapabilities } from '#types';

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

export type TranscriptionManagerOptions = {
  registry: Registry.AtomRegistry;

  /**
   * Transcription service base URL (`runtime.services.edgeServices: transcription`).
   * Transcription fails with a clear error when absent — there is no built-in endpoint.
   */
  transcriptionEndpoint?: string;

  /**
   * Enrich the message before it is written to the transcription feed.
   */
  messageEnricher?: TranscriptionCapabilities.TranscriptMessageEnricher;
};

/**
 * Manages transcription state for a meeting. Concrete implementation of the
 * {@link TranscriptionCapabilities.TranscriptionManager} service contract; consumers depend on the
 * interface (via the `TranscriptionManagerProvider` capability), not this class.
 */
export class TranscriptionManagerImpl extends Resource implements TranscriptionCapabilities.TranscriptionManager {
  private readonly _registry: Registry.AtomRegistry;
  private readonly _transcriptionEndpoint?: string;
  private readonly _messageEnricher?: TranscriptionCapabilities.TranscriptMessageEnricher;
  private _audioStreamTrack?: MediaStreamTrack = undefined;
  private _identityDid?: string = undefined;
  private _mediaRecorder?: MediaStreamRecorder = undefined;
  private _transcriber?: Transcriber = undefined;
  private _feed?: Feed.Feed = undefined;
  private _feedServiceLayer?: Layer.Layer<Database.Service> = undefined;
  private _enabledAtom = Atom.make(false);

  constructor(options: TranscriptionManagerOptions) {
    super();
    this._registry = options.registry;
    this._transcriptionEndpoint = options.transcriptionEndpoint;
    this._messageEnricher = options.messageEnricher;
  }

  get enabled(): Atom.Atom<boolean> {
    return this._enabledAtom;
  }

  getEnabled(): boolean {
    return this._registry.get(this._enabledAtom);
  }

  setFeed(space: Space, feed: Feed.Feed): this {
    this._feed = feed;
    this._feedServiceLayer = Database.layer(space.db);
    return this;
  }

  setIdentityDid(did: string): this {
    if (this._identityDid !== did) {
      this._identityDid = did;
    }
    return this;
  }

  setRecording(recording?: boolean): this {
    if (!this.isOpen || !this.getEnabled()) {
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
    if (this.getEnabled() === enabled) {
      return;
    }

    this._registry.set(this._enabledAtom, enabled ?? false);
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
    if (!this._audioStreamTrack || !this.getEnabled() || !this.isOpen) {
      return;
    }

    // Reinitialize transcriber if feed or media stream track has changed.
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
      this._transcriber = undefined;
      const transcriber = new Transcriber({
        config: {
          transcribeAfterChunksAmount: TRANSCRIBE_AFTER_CHUNKS_AMOUNT,
          prefixBufferChunksAmount: PREFIXED_CHUNKS_AMOUNT,
          endpoint: this._transcriptionEndpoint,
        },
        recorder: this._mediaRecorder,
        onSegments: (segments) => this._onSegments(segments),
      });

      try {
        await transcriber.open();
      } catch (err) {
        // Drop the recorder as well: latching an unopened transcriber would leave `needReinit`
        // false, so every later enable/track update would silently no-op for this session.
        this._mediaRecorder = undefined;
        throw err;
      }
      this._transcriber = transcriber;
    }
  }

  private async _stopTranscriber(): Promise<void> {
    await this._transcriber?.close();
  }

  private async _onSegments(segments: ContentBlock.Transcript[]): Promise<void> {
    if (!this.isOpen || !this._feed || !this._feedServiceLayer) {
      return;
    }

    let block = Obj.make(Message.Message, {
      created: new Date().toISOString(),
      blocks: segments,
      sender: { identityDid: this._identityDid },
    });

    if (this._messageEnricher) {
      block = await this._messageEnricher(block);
    }

    await Feed.append(this._feed, [block]).pipe(Effect.provide(this._feedServiceLayer), EffectEx.runAndForwardErrors);
  }
}
