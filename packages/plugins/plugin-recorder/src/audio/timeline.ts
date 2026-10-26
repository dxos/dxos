//
// Copyright 2026 DXOS.org
//

import type * as Take from '../types/Take.ts';

/** The slide on screen, as the presenter reports it. */
export type SlideMark = { id: string; title?: string; step: number; duration?: number };

/**
 * Builds a take's timeline from the slides shown while recording: each slide change closes the section on screen and
 * opens the next, and each click step is logged. Times are seconds on the take's own clock.
 */
export class Timeline {
  readonly #sections: Take.Section[] = [];
  readonly #steps: Take.Step[] = [];
  #current?: { id: string; title?: string; start: number; step: number };

  /** The slide (or its click step) on screen changed at `at`. */
  mark({ id, title, step }: SlideMark, at: number): void {
    if (this.#current?.id === id) {
      // The label can resolve after the slide is on screen.
      this.#current.title ??= title;
      if (step !== this.#current.step) {
        this.#current.step = step;
        this.#steps.push({ id, step, at });
      }
      return;
    }
    this.#close(at);
    this.#current = { id, title, start: at, step };
    if (step > 0) {
      this.#steps.push({ id, step, at });
    }
  }

  /** Ends the timeline at `at` (the take's length). */
  finish(at: number): Pick<Take.Log, 'sections' | 'steps' | 'duration'> {
    this.#close(at);
    return { sections: [...this.#sections], steps: [...this.#steps], duration: at };
  }

  #close(at: number): void {
    if (this.#current) {
      const { id, title, start } = this.#current;
      this.#sections.push({ id, ...(title ? { title } : {}), start, end: at });
      this.#current = undefined;
    }
  }
}
