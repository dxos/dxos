//
// Copyright 2026 DXOS.org
//

import { type FrameTime, type SignalProvider, type SignalSink } from '../signals.ts';

/** One timed step of a script: at `at` seconds it writes to the sink. */
export type ScriptStep = { at: number; run: (sink: SignalSink) => void };

/**
 * Plays a timeline of signal writes, for stories and demos that need state, room or meaning signals no live source
 * provides yet. Steps run in order once the visualization's clock passes their time.
 */
export class ScriptedProvider implements SignalProvider {
  readonly id = 'scripted';
  readonly #steps: ScriptStep[];
  #sink?: SignalSink;
  #next = 0;

  constructor(steps: ScriptStep[]) {
    this.#steps = [...steps].sort((a, b) => a.at - b.at);
  }

  start(sink: SignalSink): () => void {
    this.#sink = sink;
    this.#next = 0;
    return () => {
      this.#sink = undefined;
    };
  }

  sample({ time }: FrameTime): void {
    const sink = this.#sink;
    while (sink && this.#next < this.#steps.length && this.#steps[this.#next].at <= time) {
      this.#steps[this.#next++].run(sink);
    }
  }
}
