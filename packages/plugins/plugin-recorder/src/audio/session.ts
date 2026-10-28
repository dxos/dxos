//
// Copyright 2026 DXOS.org
//

import type * as Take from '../types/Take.ts';

/** What a recording covers: every slide shown, or one slide (it ends when the reader leaves it). */
export type Scope = { slideId?: string };

/** One slide's stretch of a recording, in seconds on the recording's clock. */
export type Segment = { id: string; start: number; end: number; steps: Take.Step[] };

export type MarkResult = {
  /** The segment the slide change ended. */
  closed?: Segment;
  /** The slide a new segment starts for. */
  opened?: string;
  /** A one-slide recording left its slide, so the recording is over. */
  done?: boolean;
};

/**
 * Splits a recording by slide: each slide change ends the segment on screen and starts the next, so every slide
 * read gets a take of its own; click steps are logged within their segment. A one-slide recording keeps only its
 * slide's segment and is done once the reader leaves it.
 */
export class Session {
  readonly #scope: Scope;
  #current?: { id: string; start: number; step: number; steps: Take.Step[] };

  constructor(scope: Scope = {}) {
    this.#scope = scope;
  }

  /** The slide (or its click step) on screen changed at `at`. */
  mark({ id, step }: { id: string; step: number }, at: number): MarkResult {
    if (this.#current?.id === id) {
      if (step !== this.#current.step) {
        this.#current.step = step;
        this.#current.steps.push({ step, at: at - this.#current.start });
      }
      return {};
    }

    const closed = this.#close(at);
    if (this.#scope.slideId && id !== this.#scope.slideId) {
      return { closed, done: closed !== undefined };
    }
    this.#current = { id, start: at, step, steps: step > 0 ? [{ step, at: 0 }] : [] };
    return { closed, opened: id };
  }

  /** Ends the recording at `at`. */
  finish(at: number): Segment | undefined {
    return this.#close(at);
  }

  #close(at: number): Segment | undefined {
    const current = this.#current;
    this.#current = undefined;
    return current && { id: current.id, start: current.start, end: at, steps: current.steps };
  }
}
