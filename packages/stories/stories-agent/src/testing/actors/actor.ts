//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { Cursor } from '@dxos/ui-editor';

import { type VirtualClock } from './clock.ts';

/** One actor's identity in a scene. */
export type ActorSpec = {
  name: string;
  /** Palette hue for the actor's caret, comments and name bar (e.g. `blue`). */
  hue: string;
  /** What the actor is doing, shown beside the name. */
  role?: string;
  /** Companion panels the actor's view shows beside the article (e.g. `comments`). */
  companions?: string[];
};

/** What an actor's client exposes to the actor once its article is mounted. */
export type ActorBinding = {
  view: EditorView;
  /** Creates a comment thread on `anchor` (a `from:to` cursor pair) with a first message, authored by this actor. */
  comment: (anchor: string, text: string) => Promise<void>;
};

export type Target = { after: string } | { before: string } | { end: true };

export type TypeOptions = {
  /** Characters per second; each keystroke varies around it. */
  cps?: number;
};

const DEFAULT_CPS = 14;

/**
 * Small deterministic generator, so keystroke rhythm is identical on every run.
 */
const makeRandom = (seed: number) => {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
};

/**
 * Drives one actor's own editor. Positions are found by text in the actor's current document, so edits
 * other actors make concurrently never invalidate a script; the caret then follows remote changes.
 */
export class Actor {
  readonly #random: () => number;

  constructor(
    readonly index: number,
    readonly spec: ActorSpec,
    readonly clock: VirtualClock,
    readonly binding: ActorBinding,
  ) {
    this.#random = makeRandom(index + 1);
  }

  get text(): string {
    return this.binding.view.state.doc.toString();
  }

  /** Waits `ms` of scene time. */
  pause(ms: number): Promise<void> {
    return this.clock.sleep(ms);
  }

  /** Waits until the document contains `text` (another actor typed it). */
  async waitFor(text: string, { poll = 100, timeout = 60_000 } = {}): Promise<void> {
    for (let waited = 0; !this.text.includes(text); waited += poll) {
      if (waited >= timeout) {
        throw new Error(`${this.spec.name} timed out waiting for "${text}"`);
      }
      await this.clock.sleep(poll);
    }
  }

  /** Puts the caret at a place in the document. */
  async moveTo(target: Target): Promise<void> {
    const position = this.#resolve(target);
    this.binding.view.dispatch({ selection: { anchor: position }, scrollIntoView: true, userEvent: 'select' });
    await this.pause(250);
  }

  /** Selects the first occurrence of `phrase`, leaving it highlighted. */
  async select(phrase: string): Promise<{ from: number; to: number }> {
    const from = this.#find(phrase);
    const to = from + phrase.length;
    this.binding.view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true, userEvent: 'select' });
    await this.pause(400);
    return { from, to };
  }

  /** Types at the caret, one keystroke at a time; a selection is replaced by the first keystroke. */
  async type(text: string, { cps = DEFAULT_CPS }: TypeOptions = {}): Promise<void> {
    for (const char of text) {
      const { from, to } = this.binding.view.state.selection.main;
      this.binding.view.dispatch({
        changes: { from, to, insert: char },
        selection: { anchor: from + char.length },
        scrollIntoView: true,
        userEvent: 'input.type',
      });

      // Spaces and punctuation take longer, as a typist's rhythm does.
      const base = 1_000 / cps;
      const factor = char === ' ' ? 1.4 : /[.,;:!?]/.test(char) ? 3 : 0.6 + this.#random() * 0.8;
      await this.pause(base * factor);
    }
  }

  /** Corrects the first occurrence of `phrase`: selects it, then types the replacement. */
  async replace(phrase: string, replacement: string, options?: TypeOptions): Promise<void> {
    await this.select(phrase);
    await this.type(replacement, options);
    await this.pause(300);
  }

  /** Highlights `phrase` and opens a comment thread on it. */
  async comment(phrase: string, text: string): Promise<void> {
    await this.select(phrase);
    await this.pause(600);
    // Anchored by the editor's own cursors on the current selection, which the editor has mapped through
    // edits others made meanwhile; offsets would be checked against the stored text, which can lag the view.
    const { state } = this.binding.view;
    await this.binding.comment(Cursor.getCursorFromRange(state, state.selection.main), text);
    await this.pause(400);
  }

  #find(phrase: string): number {
    const index = this.text.indexOf(phrase);
    if (index < 0) {
      throw new Error(`${this.spec.name}: "${phrase}" is not in the document`);
    }
    return index;
  }

  #resolve(target: Target): number {
    if ('end' in target) {
      return this.binding.view.state.doc.length;
    }
    if ('after' in target) {
      return this.#find(target.after) + target.after.length;
    }
    return this.#find(target.before);
  }
}
