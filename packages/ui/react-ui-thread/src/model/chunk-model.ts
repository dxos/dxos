//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';

/** Anything the model can order and address; the id must be stable across passes. */
export type Chunk = { id: string };

/**
 * Renders a chunk to its document text, including whatever trailing newline separates it from the
 * next chunk — the model concatenates the results verbatim and inserts no separator of its own.
 *
 * Renderers are invoked once per (chunk, index, revision) and their output is cached, so a renderer
 * with side effects is safe only alongside a {@link ChunkModelOptions.getRevision} that changes
 * whenever those effects should re-run.
 */
export type ChunkRenderer<T extends Chunk> = (chunk: T, index: number) => string;

/**
 * A document edit, in document offsets. `append` is called out separately from a `replace` at the
 * tail because streaming hosts treat it differently — it is the case a typewriter can animate.
 */
export type ChunkDocumentChange =
  | { type: 'append'; text: string }
  | { type: 'replace'; from: number; to: number; text: string };

/** Sink the model writes through, so it stays independent of CodeMirror. */
export interface ChunkDocument {
  apply(change: ChunkDocumentChange): void;
}

/** Document offset range occupied by a chunk's rendered text. */
export type ChunkRange = { id: string; from: number; to: number };

export type ChunkModelOptions<T extends Chunk> = {
  /**
   * Opaque value compared with `Object.is` between passes; an unchanged revision reuses the cached
   * rendering rather than invoking the renderer. Omit it to re-render everything each pass, which
   * is correct for a pure renderer.
   */
  getRevision?: (chunk: T, index: number) => unknown;
};

/**
 * Ordered, keyed chunks projected onto a text document.
 *
 * Callers {@link set} the chunks they want rendered — the whole list, declaratively — and
 * {@link sync} writes the difference to a {@link ChunkDocument}. Reconciling from a list rather
 * than from append/update/delete calls is what makes this usable over an ECHO query, which reports
 * its result *set* and not the mutations within it.
 *
 * Diffing against the last *synced* text (not the last `set`) means several `set` calls collapse
 * into one edit, and no call can be applied against offsets another call has already invalidated.
 */
export class ChunkModel<T extends Chunk> {
  /** Emits when {@link set} changes the desired document. */
  public readonly update = new Event<void>();

  /** Rendered text per chunk id, reused while the chunk's revision and index are unchanged. */
  readonly #rendered = new Map<string, { index: number; revision: unknown; text: string }>();

  #ranges: ChunkRange[] = [];

  /** The document text as of the last {@link sync}; the diff baseline. */
  #synced = '';

  /** The document text the last {@link set} asked for. */
  #desired = '';

  constructor(
    private readonly _renderer: ChunkRenderer<T>,
    private readonly _options: ChunkModelOptions<T> = {},
  ) {}

  /** The text the last {@link set} asked for, which the document matches once {@link sync} has run. */
  get text(): string {
    return this.#desired;
  }

  /**
   * Chunk ranges within {@link text}, in document order. Positions address the document only once
   * {@link sync} has applied the pending change.
   */
  getRanges(): ChunkRange[] {
    return this.#ranges;
  }

  /**
   * Drop the chunks, so the next {@link sync} empties the document. The diff baseline is kept
   * because it describes what the document still holds — see {@link rebase} for the other case.
   */
  reset(): this {
    this.#rendered.clear();
    this.#ranges = [];
    if (this.#desired === '') {
      return this;
    }

    this.#desired = '';
    this.update.emit();
    return this;
  }

  /**
   * Declare what the document already contains, without writing to it. Needed when the model
   * outlives the view it was driving — a remounted editor starts empty, and a model that still
   * believed its old text would diff against a document that no longer exists.
   */
  rebase(text = ''): this {
    this.#synced = text;
    return this;
  }

  /** Render `chunks` and record the resulting document; emits {@link update} if it changed. */
  set(chunks: readonly T[]): this {
    const ranges: ChunkRange[] = [];
    let text = '';
    const seen = new Set<string>();
    const { getRevision } = this._options;
    for (const [index, chunk] of chunks.entries()) {
      const revision = getRevision?.(chunk, index);
      const cached = this.#rendered.get(chunk.id);
      // Without `getRevision` there is nothing to invalidate against, so the cache is not consulted
      // at all — every chunk re-renders, which is what a pure renderer wants. Index is part of the
      // key because the renderer receives it: a chunk that keeps its revision but moves is stale.
      const rendered =
        getRevision && cached && cached.index === index && Object.is(cached.revision, revision)
          ? cached.text
          : this._renderer(chunk, index);
      this.#rendered.set(chunk.id, { index, revision, text: rendered });
      seen.add(chunk.id);
      ranges.push({ id: chunk.id, from: text.length, to: text.length + rendered.length });
      text += rendered;
    }

    for (const id of this.#rendered.keys()) {
      if (!seen.has(id)) {
        this.#rendered.delete(id);
      }
    }

    this.#ranges = ranges;
    if (text === this.#desired) {
      return this;
    }

    this.#desired = text;
    this.update.emit();
    return this;
  }

  /** Write the difference between the document and the last {@link set} to `document`. */
  sync(document: ChunkDocument): this {
    const change = diffText(this.#synced, this.#desired);
    if (change) {
      this.#synced = this.#desired;
      document.apply(change);
    }
    return this;
  }
}

/**
 * Minimal single-range edit turning `before` into `after`.
 *
 * A pure extension is reported as an `append` so streaming hosts can animate it; everything else
 * collapses to the one range between the common prefix and the common suffix.
 */
export const diffText = (before: string, after: string): ChunkDocumentChange | undefined => {
  if (before === after) {
    return undefined;
  }
  if (after.startsWith(before)) {
    return { type: 'append', text: after.slice(before.length) };
  }

  const max = Math.min(before.length, after.length);
  let prefix = 0;
  while (prefix < max && before[prefix] === after[prefix]) {
    prefix++;
  }
  let suffix = 0;
  while (suffix < max - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) {
    suffix++;
  }

  return {
    type: 'replace',
    from: prefix,
    to: before.length - suffix,
    text: after.slice(prefix, after.length - suffix),
  };
};
