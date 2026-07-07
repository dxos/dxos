//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Space } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { Database, Feed, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type ContentBlock, Message } from '@dxos/types';

import { type TranscriptionCapabilities } from '#types';

export type TranscriptionManagerOptions = {
  registry: Registry.Registry;

  /** Feed URIs an open manager is writing to; the UI hides its local recorder for these. */
  managedFeeds?: Atom.Writable<ReadonlySet<string>>;

  /**
   * Enrich the message before it is written to the transcription feed (e.g. entity extraction).
   */
  messageEnricher?: TranscriptionCapabilities.TranscriptMessageEnricher;
};

/**
 * Writes transcript segments to a meeting's feed. It does **not** capture audio or run ASR — segments arrive
 * via {@link addTranscript} (RealtimeKit native transcription, relayed by plugin-calls `CallManager.transcript`).
 * Concrete implementation of {@link TranscriptionCapabilities.TranscriptionManager}; consumers depend on the
 * interface (via the `TranscriptionManagerProvider` capability), not this class.
 *
 * Responsibilities: the enabled flag, the feed binding, optional message enrichment, and — while open with a
 * bound feed — advertising that feed in `managedFeeds` so the UI suppresses its own local recorder for it.
 */
export class TranscriptionManagerImpl extends Resource implements TranscriptionCapabilities.TranscriptionManager {
  private readonly _registry: Registry.Registry;
  private readonly _managedFeeds?: Atom.Writable<ReadonlySet<string>>;
  private readonly _messageEnricher?: TranscriptionCapabilities.TranscriptMessageEnricher;
  private _identityDid?: string = undefined;
  private _feed?: Feed.Feed = undefined;
  private _feedUri?: string = undefined;
  private _feedServiceLayer?: Layer.Layer<Database.Service> = undefined;
  private _enabledAtom = Atom.make(false);

  constructor(options: TranscriptionManagerOptions) {
    super();
    this._registry = options.registry;
    this._managedFeeds = options.managedFeeds;
    this._messageEnricher = options.messageEnricher;
  }

  get enabled(): Atom.Atom<boolean> {
    return this._enabledAtom;
  }

  getEnabled(): boolean {
    return this._registry.get(this._enabledAtom);
  }

  setFeed(space: Space, feed: Feed.Feed): this {
    // Rebinding to a different feed: stop advertising the old one.
    if (this._feedUri) {
      this.#setManaged(this._feedUri, false);
    }
    this._feed = feed;
    this._feedServiceLayer = Database.layer(space.db);
    this._feedUri = Obj.getURI(feed);
    if (this.isOpen) {
      this.#setManaged(this._feedUri, true);
    }
    return this;
  }

  setIdentityDid(did: string): this {
    if (this._identityDid !== did) {
      this._identityDid = did;
    }
    return this;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (this.getEnabled() === enabled) {
      return;
    }
    this._registry.set(this._enabledAtom, enabled ?? false);
  }

  /**
   * Appends transcript segments (e.g. native RealtimeKit transcription) to the feed, enriching them first
   * when a `messageEnricher` is configured. No-op unless transcription is enabled and a feed is set.
   */
  async addTranscript(segments: ContentBlock.Transcript[]): Promise<void> {
    if (!this.getEnabled()) {
      return;
    }
    await this._onSegments(segments);
  }

  protected override async _open(): Promise<void> {
    // A feed set before open should still be advertised.
    if (this._feedUri) {
      this.#setManaged(this._feedUri, true);
    }
  }

  protected override async _close(): Promise<void> {
    if (this._feedUri) {
      this.#setManaged(this._feedUri, false);
    }
  }

  #setManaged(uri: string, present: boolean): void {
    if (!this._managedFeeds) {
      return;
    }
    const current = this._registry.get(this._managedFeeds);
    if (current.has(uri) === present) {
      return;
    }
    const next = new Set(current);
    present ? next.add(uri) : next.delete(uri);
    this._registry.set(this._managedFeeds, next);
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
