//
// Copyright 2026 DXOS.org
//

import { ListModel } from '@dxos/react-ui-virtual';
import { type Message } from '@dxos/types';

import { type MessageRenderer, type SearchHit, defaultRenderer, isPrompt, messageText, searchFeed } from './feed-model';

/**
 * One position navigation can land on (SPEC: Stop).
 *
 * Produced by a pluggable policy over the model and consumed identically by every driver —
 * toolbar, arrow keys, outliner, minimap — which is what keeps the rails and the keymap from
 * growing parallel wiring.
 */
export type Stop = {
  index: number;
  id: string;
  label?: string;
};

/** The built-in policies; a host may hand a function instead. */
export type StopsPolicy = 'message' | 'prompt' | ((message: Message.Message, index: number) => boolean);

export type FeedModelOptions = {
  messages?: readonly Message.Message[];
  stops?: StopsPolicy;
  /** Paged history: consumed when the window reaches the start edge. Paging is the model's business. */
  loadBefore?: () => Promise<readonly Message.Message[]>;
  /** The forward twin, for feeds that are windows into something longer. */
  loadAfter?: () => Promise<readonly Message.Message[]>;
};

/**
 * The native case, not an add-on (SPEC: FeedModel): a ListModel of messages carrying the feed's
 * own semantics — the stops policy, the streaming tail, and iteration. The list consumes this and
 * nothing else; `hits`, `isAnchor` and `streamingId` all left the props API and live here or in
 * the decoration provider.
 *
 * ECHO/queue bindings adapt to this outside the package; `fromMessages` adapts the plain case.
 */
export class FeedModel extends ListModel<Message.Message> {
  #stops: StopsPolicy;
  #streamingId: string | undefined;
  #loading = false;
  readonly #loadBefore?: () => Promise<readonly Message.Message[]>;
  readonly #loadAfter?: () => Promise<readonly Message.Message[]>;

  constructor({ messages = [], stops = 'message', loadBefore, loadAfter }: FeedModelOptions = {}) {
    super({ items: messages, getId: (message) => message.id });
    this.#stops = stops;
    this.#loadBefore = loadBefore;
    this.#loadAfter = loadAfter;
  }

  get messages(): readonly Message.Message[] {
    return this.items;
  }

  /** The tail message reconciling by delta; its item must not remount per chunk. */
  get streamingId(): string | undefined {
    return this.#streamingId;
  }

  setStreaming(id: string | undefined): void {
    const previous = this.#streamingId;
    if (previous === id) {
      return;
    }
    this.#streamingId = id;
    // The item that stopped (or started) streaming re-renders; the rest of the feed does not care.
    for (const changed of [previous, id]) {
      if (changed) {
        this.update(changed);
      }
    }
  }

  /** A chunk arrived for the streaming tail: same identity, longer content. */
  stream(id: string): void {
    this.update(id);
  }

  setStops(stops: StopsPolicy): void {
    this.#stops = stops;
  }

  /**
   * The positions navigation can land on, under the current policy.
   *
   * Recomputed on demand rather than cached: a policy is a predicate over the model, and the model
   * knows when it changed — callers that want reactivity derive from `rowsAtom`.
   */
  stops(): Stop[] {
    const predicate = this.#stops === 'message' ? () => true : this.#stops === 'prompt' ? isPrompt : this.#stops;

    const stops: Stop[] = [];
    this.messages.forEach((message, index) => {
      if (predicate(message, index)) {
        stops.push({ index, id: message.id });
      }
    });

    return stops;
  }

  /**
   * The window reached the start: ask the source for history.
   *
   * The model owns iteration (SPEC F-7.2) — the pages arrive as a prepend, which the virtualizer
   * is told about, so nothing on screen moves (F-1.1). Serialized, because edges are reached once
   * per frame while the reader sits on them.
   */
  async more(edge: 'start' | 'end'): Promise<boolean> {
    const load = edge === 'start' ? this.#loadBefore : this.#loadAfter;
    if (!load || this.#loading) {
      return false;
    }

    this.#loading = true;
    try {
      const page = await load();
      if (!page.length) {
        return false;
      }

      if (edge === 'start') {
        this.prepend(page);
      } else {
        this.append(page);
      }

      return true;
    } finally {
      this.#loading = false;
    }
  }

  /** Model-level search, since virtualization hides most items from any DOM search. */
  search(query: string, renderer: MessageRenderer = defaultRenderer): SearchHit[] {
    return searchFeed(this.messages, renderer, query);
  }

  /** The rendered text of one message, for previews and rails. */
  textOf(id: string, renderer: MessageRenderer = defaultRenderer): string | undefined {
    const index = this.indexOf(id);
    const message = this.at(index);
    return message && messageText(message, renderer);
  }
}

/** The plain case: a feed over an array the host already has. */
export const fromMessages = (messages: readonly Message.Message[], options: Omit<FeedModelOptions, 'messages'> = {}) =>
  new FeedModel({ messages, ...options });
