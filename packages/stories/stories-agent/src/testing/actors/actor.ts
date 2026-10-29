//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';

import { addressFromA1Notation } from '@dxos/compute-hyperformula';
import { Obj } from '@dxos/echo';
import { Doc, applyEdits } from '@dxos/echo-doc';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetUtil from '@dxos/plugin-sheet/SheetUtil';
import { Cursor } from '@dxos/ui-editor';

import { type VirtualClock } from './clock.ts';

/** One actor's identity in a scene. */
export type ActorSpec = {
  name: string;
  /** Palette hue for the actor's caret, comments and name bar (e.g. `blue`). */
  hue: string;
  /** What the actor is doing, shown beside the name. */
  role?: string;
  /** The object the actor's view shows, by name; unset is the flow's document. */
  subject?: string;
  /** Companion panels the actor's view shows beside the article (e.g. `comments`). */
  companions?: string[];
};

/** Which comment thread a reply is for: the one anchored on a phrase of the document, on an anchor, or on a whole object. */
export type ThreadMatch = { phrase: string } | { anchor: string } | { subject: string };

/** What an actor's client exposes to the actor once its view is mounted. */
export type ActorBinding = {
  /** The actor's own view, which scopes what the actor finds in the page. */
  root: HTMLElement;
  /** The editor of the actor's document, when the actor's subject is the document. */
  view?: EditorView;
  /** An object of the shared space, by name, as this actor's client holds it. */
  object: (name: string) => Obj.Unknown | undefined;
  /** Opens a comment thread on `subject` (default the document) with a first message, authored by this actor. */
  comment: (input: { subject?: string; anchor?: string; text: string }) => Promise<void>;
  /** Adds a message, authored by this actor, to the matching thread; false if there is none yet. */
  reply: (match: ThreadMatch, text: string) => Promise<boolean>;
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
 * Drives one actor's own view. Positions in the document are found by text, so edits other actors make
 * concurrently never invalidate a script; the caret then follows remote changes.
 */
/** Windows in which no actor edits: the last `length` ms of every `every` ms of scene time. */
export type QuietWindows = { every: number; length: number };

export class Actor {
  readonly #random: () => number;
  /** A heading the view keeps at its top while the actor types, so their chapter stays in view. */
  #pinned?: string;

  constructor(
    readonly index: number,
    readonly spec: ActorSpec,
    readonly clock: VirtualClock,
    readonly binding: ActorBinding,
    readonly quiet?: QuietWindows,
  ) {
    this.#random = makeRandom(index + 1);
  }

  get view(): EditorView {
    const view = this.binding.view;
    invariant(view, `${this.spec.name} has no document editor`);
    return view;
  }

  get text(): string {
    return this.view.state.doc.toString();
  }

  /** Waits `ms` of scene time. */
  async pause(ms: number): Promise<void> {
    await this.clock.sleep(ms);
    // Every actor stops in the same windows, so replication can catch up before anyone edits again.
    if (this.quiet) {
      const { every, length } = this.quiet;
      const into = this.clock.now % every;
      if (into >= every - length) {
        await this.clock.sleep(every - into);
      }
    }
  }

  /** Waits until `check` holds, polling in scene time. */
  async until(check: () => boolean, what: string, { poll = 100, timeout = 60_000 } = {}): Promise<void> {
    for (let waited = 0; !check(); waited += poll) {
      if (waited >= timeout) {
        throw new Error(`${this.spec.name} timed out waiting for ${what}`);
      }
      await this.clock.sleep(poll);
    }
  }

  /** Waits until the document contains `text` (another actor typed it). */
  waitFor(text: string, options?: { poll?: number; timeout?: number }): Promise<void> {
    return this.until(() => this.text.includes(text), `"${text}"`, options);
  }

  /** Scrolls the view so `heading` sits at its top. */
  scrollTo(heading: string): void {
    this.view.dispatch({ effects: EditorView.scrollIntoView(this.#find(heading), { y: 'start', yMargin: 16 }) });
  }

  /** Keeps `heading` at the top of the view from now on, as the actor's chapter grows and others' grow above it. */
  async pin(heading: string): Promise<void> {
    this.#pinned = heading;
    this.scrollTo(heading);
    await this.pause(250);
  }

  /** Puts the caret at a place in the document. */
  async moveTo(target: Target): Promise<void> {
    const position = this.#resolve(target);
    this.view.dispatch({ selection: { anchor: position }, scrollIntoView: !this.#pinned, userEvent: 'select' });
    this.#repin();
    await this.pause(250);
  }

  /** Selects the first occurrence of `phrase`, leaving it highlighted. */
  async select(phrase: string): Promise<{ from: number; to: number }> {
    const from = this.#find(phrase);
    const to = from + phrase.length;
    this.view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: !this.#pinned, userEvent: 'select' });
    await this.pause(400);
    return { from, to };
  }

  /** Types at the caret, one keystroke at a time; a selection is replaced by the first keystroke. */
  async type(text: string, { cps = DEFAULT_CPS }: TypeOptions = {}): Promise<void> {
    for (const char of text) {
      const { from, to } = this.view.state.selection.main;
      this.view.dispatch({
        changes: { from, to, insert: char },
        selection: { anchor: from + char.length },
        scrollIntoView: !this.#pinned,
        userEvent: 'input.type',
      });
      if (char === ' ' || char === '\n') {
        this.#repin();
      }

      // Spaces and punctuation take longer, as a typist's rhythm does.
      const base = 1_000 / cps;
      const factor = char === ' ' ? 1.4 : /[.,;:!?]/.test(char) ? 3 : 0.6 + this.#random() * 0.8;
      await this.pause(base * factor);
    }
    this.#repin();
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
    const { state } = this.view;
    await this.binding.comment({ anchor: Cursor.getCursorFromRange(state, state.selection.main), text });
    await this.pause(400);
  }

  /** Opens a comment thread on an object as a whole, or on an anchor of it (a sheet's cell range). */
  async commentOn(subject: string, text: string, anchor?: string): Promise<void> {
    await this.pause(600);
    await this.binding.comment({ subject, anchor, text });
    await this.pause(400);
  }

  /** Replies to a comment thread, waiting for another actor to open it if need be. */
  async reply(match: ThreadMatch | string, text: string, { poll = 250, timeout = 60_000 } = {}): Promise<void> {
    const thread = typeof match === 'string' ? { phrase: match } : match;
    for (let waited = 0; !(await this.binding.reply(thread, text)); waited += poll) {
      if (waited >= timeout) {
        throw new Error(`${this.spec.name} found no thread for ${JSON.stringify(thread)}`);
      }
      await this.clock.sleep(poll);
    }
    await this.pause(400);
  }

  /** Adds one record (a box or an arrow) to a drawing's canvas. */
  async addRecord(drawing: string, key: string, record: unknown, pause = 900): Promise<void> {
    const object = this.binding.object(drawing);
    invariant(Obj.instanceOf(Drawing.Drawing, object), `${this.spec.name}: no drawing "${drawing}"`);
    const canvas = await object.canvas.load();
    invariant(Drawing.isCanvas(canvas), `${this.spec.name}: "${drawing}" has no base canvas`);
    Obj.update(canvas, (canvas) => {
      canvas.content[key] = record;
    });
    await this.pause(pause);
  }

  /**
   * Replaces `oldString` with `newString` in a document the actor's view need not show, as the assistant edits
   * one: a splice of the shared text, so it merges with whatever others are typing at the time.
   */
  async edit(document: string, oldString: string, newString: string, pause = 600): Promise<void> {
    const object = this.binding.object(document);
    invariant(Obj.instanceOf(Markdown.Document, object), `${this.spec.name}: no document "${document}"`);
    const text = await object.content.load();
    applyEdits(Doc.createAccessor(text, ['content']), [{ oldString, newString }]);
    await this.pause(pause);
  }

  /** Writes one cell of a sheet, as `SheetOperation.SetValues` does. */
  async setCell(sheet: string, address: string, value: unknown, pause = 450): Promise<void> {
    const object = this.binding.object(sheet);
    invariant(Obj.instanceOf(Sheet.Sheet, object), `${this.spec.name}: no sheet "${sheet}"`);
    Obj.update(object, (object) => {
      object.cells[SheetUtil.addressToIndex(object, addressFromA1Notation(address))] = { value };
    });
    await this.pause(pause);
  }

  /**
   * Types `prompt` into the actor's assistant chat, sends it, and waits until the reply containing `expect`
   * shows; the actor's track stays busy meanwhile, so the reply lands at the same scene time on every run.
   */
  async ask(prompt: string, expect: string, { cps = DEFAULT_CPS, timeout = 60_000 } = {}): Promise<void> {
    const content = this.binding.root.querySelector<HTMLElement>('[role="group"] .cm-content');
    const prompter = content && EditorView.findFromDOM(content);
    invariant(prompter, `${this.spec.name} has no chat prompt`);
    for (const char of prompt) {
      const { from, to } = prompter.state.selection.main;
      prompter.dispatch({
        changes: { from, to, insert: char },
        selection: { anchor: from + 1 },
        userEvent: 'input.type',
      });
      await this.pause((1_000 / cps) * (char === ' ' ? 1.4 : 0.6 + this.#random() * 0.8));
    }
    await this.pause(500);
    const send = this.binding.root.querySelector<HTMLButtonElement>('[data-testid="assistant.send"]');
    invariant(send, `${this.spec.name} has no send button`);
    send.click();
    // Polled on the scene clock, so stepping keeps moving while the assistant's request loop answers.
    await this.until(() => this.binding.root.textContent?.includes(expect) ?? false, `a reply containing "${expect}"`, {
      timeout,
    });
    await this.pause(400);
  }

  #repin(): void {
    if (this.#pinned) {
      this.scrollTo(this.#pinned);
    }
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
      return this.view.state.doc.length;
    }
    if ('after' in target) {
      return this.#find(target.after) + target.after.length;
    }
    return this.#find(target.before);
  }
}
