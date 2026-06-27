//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import {
  appendPendingText,
  cancelPendingText,
  setPendingAnchor,
  setPendingFinal,
  setPendingInterim,
} from './pending-text';

//
// Sinks — decouple the streamer from its target (a live editor, or memory for tests/stories).
//

/**
 * Target for streamed pending text. The {@link PendingTextStreamer} writes to this interface; the
 * editor implementation dispatches CodeMirror effects, while the memory implementation accumulates
 * state so the mechanism can be exercised without a CodeMirror component.
 */
export type PendingTextSink = {
  begin(options?: { anchor?: number; placeholder?: string }): void;
  /** Set the volatile in-flight tail. */
  interim(text: string): void;
  /** Append finalized text to the buffer. */
  appendFinal(text: string): void;
  /** Replace the finalized buffer wholesale (e.g. post-processed text). */
  replaceFinal(text: string): void;
  cancel(): void;
};

/** Sink that drives the `pendingText` extension in a live editor via its state effects. */
export const editorPendingTextSink = (view: EditorView): PendingTextSink => ({
  begin: ({ anchor = view.state.selection.main.head, placeholder } = {}) =>
    view.dispatch({ effects: setPendingAnchor.of({ anchor, placeholder }) }),
  interim: (text) => view.dispatch({ effects: setPendingInterim.of(text) }),
  appendFinal: (text) => view.dispatch({ effects: appendPendingText.of(text) }),
  replaceFinal: (text) => view.dispatch({ effects: setPendingFinal.of(text) }),
  cancel: () => view.dispatch({ effects: cancelPendingText.of() }),
});

export type PendingTextSnapshot = {
  active: boolean;
  final: string;
  interim: string;
  placeholder?: string;
};

/** In-memory sink for tests and CodeMirror-free stories. */
export const memoryPendingTextSink = (
  onChange?: (snapshot: PendingTextSnapshot) => void,
): PendingTextSink & { snapshot: () => PendingTextSnapshot } => {
  let state: PendingTextSnapshot = { active: false, final: '', interim: '', placeholder: undefined };
  const set = (next: PendingTextSnapshot) => {
    state = next;
    onChange?.(state);
  };

  return {
    begin: ({ placeholder } = {}) => set({ active: true, final: '', interim: '', placeholder }),
    interim: (text) => set({ ...state, interim: text }),
    appendFinal: (text) => set({ ...state, final: state.final + text, interim: '', placeholder: undefined }),
    replaceFinal: (text) => set({ ...state, final: text, placeholder: undefined }),
    cancel: () => set({ active: false, final: '', interim: '', placeholder: undefined }),
    snapshot: () => state,
  };
};

//
// Streamer — buffering, pacing, and post-processing between a text source and a sink.
//

/** Minimal timer interface so tests can drive the streamer deterministically. */
export type Scheduler = {
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const defaultScheduler: Scheduler = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type PendingTextStreamerOptions = {
  /** Delay (ms) before the first text is revealed — absorbs the source's initial latency. */
  initialBufferMs?: number;
  /** `batch` reveals each pushed chunk whole; `word` reveals one word per {@link wordIntervalMs}. */
  mode?: 'batch' | 'word';
  /** Pacing (ms) for `word` mode. */
  wordIntervalMs?: number;
  /** Idle delay (ms) before {@link postProcess} runs after the buffer settles. */
  postProcessDebounceMs?: number;
  /** Rewrites the finalized buffer once it settles (e.g. entity extraction / dx-anchor links). */
  postProcess?: (final: string) => string | Promise<string>;
  /** Injectable timers (defaults to the global timers). */
  scheduler?: Scheduler;
};

const DEFAULTS = {
  initialBufferMs: 0,
  mode: 'batch' as const,
  wordIntervalMs: 120,
  postProcessDebounceMs: 800,
};

/**
 * Streams text from an arbitrary source (e.g. a transcriber, or a scripted mock) into a
 * {@link PendingTextSink}, decoupling the source from the editor and centralizing the cross-cutting
 * concerns: an initial buffering delay, optional word-by-word reveal, and a post-processing pass.
 */
export class PendingTextStreamer {
  readonly #sink: PendingTextSink;
  readonly #options: Required<Omit<PendingTextStreamerOptions, 'postProcess' | 'scheduler'>> &
    Pick<PendingTextStreamerOptions, 'postProcess'>;
  readonly #scheduler: Scheduler;

  #started = false;
  #buffering = false;
  #final = '';
  #queue: string[] = [];
  #bufferHandle: unknown = null;
  #wordHandle: unknown = null;
  #postHandle: unknown = null;

  constructor(sink: PendingTextSink, options: PendingTextStreamerOptions = {}) {
    this.#sink = sink;
    this.#options = { ...DEFAULTS, ...options };
    this.#scheduler = options.scheduler ?? defaultScheduler;
  }

  /** Begin a session; nothing is revealed until the initial buffer elapses (or the first push, if 0). */
  start(options: { placeholder?: string; anchor?: number } = {}): void {
    this.#started = true;
    this.#final = '';
    this.#queue = [];
    this.#sink.begin(options);
    if (this.#options.initialBufferMs > 0) {
      this.#buffering = true;
      this.#bufferHandle = this.#scheduler.setTimeout(() => {
        this.#buffering = false;
        this.#bufferHandle = null;
        this.#drain();
      }, this.#options.initialBufferMs);
    }
  }

  /** Feed a finalized text chunk from the source. */
  push(text: string): void {
    if (!this.#started) {
      this.start();
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return;
    }
    this.#queue.push(...(this.#options.mode === 'word' ? trimmed.split(/\s+/) : [trimmed]));
    this.#drain();
  }

  /** Feed a volatile interim chunk (when the source yields partials). */
  pushInterim(text: string): void {
    if (!this.#started) {
      this.start();
    }
    if (!this.#buffering) {
      this.#sink.interim(text);
    }
  }

  /** Reveal everything immediately and run any pending post-process (e.g. on stop). */
  flush(): void {
    this.#clear(this.#bufferHandle);
    this.#bufferHandle = null;
    this.#buffering = false;
    this.#clear(this.#wordHandle);
    this.#wordHandle = null;
    while (this.#queue.length > 0) {
      this.#appendFinal(this.#queue.shift()!);
    }
    this.#sink.interim('');
    if (this.#options.postProcess && this.#postHandle != null) {
      this.#clear(this.#postHandle);
      this.#postHandle = null;
      void this.#runPostProcess();
    }
  }

  dispose(): void {
    [this.#bufferHandle, this.#wordHandle, this.#postHandle].forEach((handle) => this.#clear(handle));
    this.#bufferHandle = this.#wordHandle = this.#postHandle = null;
  }

  #drain(): void {
    if (this.#buffering) {
      return;
    }
    if (this.#options.mode === 'word') {
      if (this.#wordHandle == null) {
        this.#tickWord();
      }
    } else {
      while (this.#queue.length > 0) {
        this.#appendFinal(this.#queue.shift()!);
      }
    }
  }

  #tickWord(): void {
    const word = this.#queue.shift();
    if (word == null) {
      this.#wordHandle = null;
      return;
    }
    this.#appendFinal(word);
    this.#wordHandle = this.#scheduler.setTimeout(() => this.#tickWord(), this.#options.wordIntervalMs);
  }

  #appendFinal(text: string): void {
    const chunk = (this.#final.length > 0 ? ' ' : '') + text;
    this.#final += chunk;
    this.#sink.appendFinal(chunk);
    this.#schedulePostProcess();
  }

  #schedulePostProcess(): void {
    if (!this.#options.postProcess) {
      return;
    }
    this.#clear(this.#postHandle);
    this.#postHandle = this.#scheduler.setTimeout(() => {
      this.#postHandle = null;
      void this.#runPostProcess();
    }, this.#options.postProcessDebounceMs);
  }

  async #runPostProcess(): Promise<void> {
    const input = this.#final;
    const result = await this.#options.postProcess!(input);
    // Skip if the buffer grew while processing — a later pass will cover the newer text.
    if (result !== input && this.#final === input) {
      this.#final = result;
      this.#sink.replaceFinal(result);
    }
  }

  #clear(handle: unknown): void {
    if (handle != null) {
      this.#scheduler.clearTimeout(handle);
    }
  }
}
