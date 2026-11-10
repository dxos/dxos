//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { synchronized } from '@dxos/async';
import { Resource } from '@dxos/context';
import { Database, Feed, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { type Transcriber, TranscriptionNotConfiguredError } from '@dxos/pipeline-transcription';
import { type JoinTranscription, createRealtimeKitTranscriber } from '@dxos/react-ui-transcription/capture';
import { type ContentBlock, Message } from '@dxos/types';

import { TranscriptionCapabilities } from '#types';

export type TranscriptionManagerOptions = {
  registry: Registry.AtomRegistry;

  /**
   * Joins this identity's RealtimeKit transcription meeting (`CallsServiceClient.joinTranscription`).
   * Transcription fails with {@link TranscriptionNotConfiguredError} when absent, i.e. when EDGE is not configured.
   */
  join?: JoinTranscription;

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
  private readonly _join?: JoinTranscription;
  private readonly _messageEnricher?: TranscriptionCapabilities.TranscriptMessageEnricher;
  private _audioStreamTrack?: MediaStreamTrack = undefined;
  private _identityDid?: string = undefined;
  private _transcriber?: Transcriber = undefined;
  /** The track {@link _transcriber} was opened on; a different track means a new session. */
  private _transcriberTrack?: MediaStreamTrack = undefined;
  private _feed?: Feed.Feed = undefined;
  private _feedServiceLayer?: Layer.Layer<Database.Service> = undefined;
  private _enabledAtom = Atom.make(false);

  constructor(options: TranscriptionManagerOptions) {
    super();
    this._registry = options.registry;
    this._join = options.join;
    this._messageEnricher = options.messageEnricher;
  }

  get enabled(): Atom.Atom<boolean> {
    return this._enabledAtom;
  }

  getEnabled(): boolean {
    return this._registry.get(this._enabledAtom);
  }

  setFeed(db: Database.Database, feed: Feed.Feed): this {
    this._feed = feed;
    this._feedServiceLayer = Database.layer(db);
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
      this._transcriber?.start();
    } else {
      this._transcriber?.stop();
    }
    return this;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (this.getEnabled() === enabled) {
      return;
    }

    // Set first because `_maybeRestartTranscriber` gates on it, but roll back on failure: an
    // unconfigured enable throws, and a latched atom would show "Stop transcription" — and tell
    // remote peers transcription is on — while nothing records, with the equality guard above
    // blocking any retry in the same direction.
    this._registry.set(this._enabledAtom, enabled);
    try {
      if (enabled) {
        await this._maybeRestartTranscriber();
      } else {
        await this._stopTranscriber();
      }
    } catch (err) {
      this._registry.set(this._enabledAtom, !enabled);
      throw err;
    }
  }

  async flush(): Promise<void> {
    if (!this.isOpen || !this.getEnabled()) {
      return;
    }

    await this._transcriber?.flush();
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
    const track = this._audioStreamTrack;
    if (!track || !this.getEnabled() || !this.isOpen || track === this._transcriberTrack) {
      return;
    }
    if (!this._join) {
      throw new TranscriptionNotConfiguredError();
    }

    // Retire the old session before opening one on the new track, so two never publish at once.
    await this.#closeTranscriber();
    const transcriber = createRealtimeKitTranscriber({ audioStreamTrack: track, join: this._join })({
      onSegments: (segments) => this._onSegments(segments),
    });
    try {
      await transcriber.open();
    } catch (err) {
      await transcriber.close().catch((closeErr) => log.warn('failed to close transcriber', { err: closeErr }));
      throw err;
    }
    this._transcriber = transcriber;
    this._transcriberTrack = track;
  }

  private async _stopTranscriber(): Promise<void> {
    await this.#closeTranscriber();
  }

  /**
   * `Resource` memoizes its close promise, so a rejected close would resurface on every later
   * restart and wedge transcription for the session.
   */
  async #closeTranscriber(): Promise<void> {
    const transcriber = this._transcriber;
    this._transcriber = undefined;
    this._transcriberTrack = undefined;
    await transcriber?.close().catch((err) => log.warn('failed to close transcriber', { err }));
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
