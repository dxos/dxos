//
// Copyright 2025 DXOS.org
//

import { Text } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import { Event } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type Chunk = { id: string };

/**
 * Covert block to a set of markdown lines.
 */
export type ChunkRenderer<T extends Chunk> = (chunk: T, index: number, debug?: boolean) => string[];

/**
 * Abstract representation of the document model.
 */
export interface ChunkDocument {
  lineCount(): number;
  replaceLines(from: number, remove: number, insert: string[]): void;
}

/**
 * Codemirror document adapter.
 */
export class DocumentAdapter implements ChunkDocument {
  constructor(private readonly _view: EditorView) {}

  /** The document must always have at least one line. */
  lineCount(): number {
    return this._view.state.doc.lines - 1;
  }

  replaceLines(from: number, remove: number, insert: string[]): void {
    log('replaceLines', { count: this._view.state.doc.lines, from, remove, insert });

    const numLines = this._view.state.doc.lines;
    const posFrom = this._view.state.doc.line(from).from;
    const posTo = remove === 0 ? posFrom : this._view.state.doc.line(Math.min(numLines, from + remove)).from;

    // Don't remove the last line.
    let text = insert.join('\n');
    if (posTo === this._view.state.doc.length) {
      text += '\n';
    }

    this._view.dispatch({
      changes: { from: posFrom, to: posTo, insert: text },
    });
  }
}

type ChunkChange<T extends Chunk> =
  | {
      type: 'append';
      index: number;
      chunk: T;
    }
  | {
      type: 'update';
      index: number;
      chunk: T;
    }
  | {
      type: 'delete';
      index: number;
      id: string;
    };

/**
 * Each Chunk can be converted into a set of lines.
 * Chunks can be added, updated or deleted from the Queue.
 * A Document is an immutable projection that represents a flat list of lines corresponding to the Queue.
 *
 * Ideally we would implement a custom virtual Text model for the View, but this currently isn't possible in Codemirror.
 * Instead this model tracks changes and syncs them with the ChunkDocument.
 */
export class SerializationModel<T extends Chunk> {
  /** Ordered set of chunks. */
  private readonly _chunks: T[] = [];

  /** Map of chunk IDs to their current line counts. */
  private readonly _chunkLineCounts = new Map<string, number>();

  /** Map of line numbers to chunk IDs. */
  private readonly _lineToChunk = new Map<number, T>();

  /** Track chunk changes since last sync. */
  private readonly _changes: Array<ChunkChange<T>> = [];

  /** Emits when the document is updated. */
  public readonly update = new Event<void>();

  constructor(
    private readonly _renderer: ChunkRenderer<T>,
    initialChunks: T[] = [],
  ) {
    initialChunks.forEach((chunk) => {
      this.appendChunk(chunk);
    });
  }

  toJSON(): { chunks: number; changes: number } {
    return {
      chunks: this._chunks.length,
      changes: this._changes.length,
    };
  }

  get doc() {
    return Text.of([...this._chunks.flatMap((chunk, index) => this._renderer(chunk, index)), '']);
  }

  get chunks() {
    return this._chunks;
  }

  /**
   * Get the block ID at the given line number.
   */
  getChunkAtLine(line: number): T | undefined {
    return this._lineToChunk.get(line);
  }

  reset(): this {
    this._chunks.length = 0;
    this._chunkLineCounts.clear();
    this._lineToChunk.clear();
    this.update.emit();
    return this;
  }

  appendChunk(chunk: T): this {
    const index = this._chunks.length;
    this._chunks.push(chunk);
    this._changes.push({ type: 'append', index, chunk });
    this.update.emit();
    return this;
  }

  updateChunk(chunk: T): this {
    const index = this._chunks.findIndex((c) => c.id === chunk.id);
    invariant(index !== -1);
    this._chunks[index] = chunk;
    this._changes.push({ type: 'update', index, chunk });
    this.update.emit();
    return this;
  }

  deleteBlock(id: string): this {
    const index = this._chunks.findIndex((c) => c.id === id);
    invariant(index !== -1);
    this._chunks.splice(index, 1);
    this._changes.push({ type: 'delete', index, id });
    this.update.emit();
    return this;
  }

  /**
   * Syncs the tracked changes with the ChunkDocument.
   */
  sync(document: ChunkDocument): this {
    log('sync', { changes: this._changes });

    // Process each change in order.
    for (const change of this._changes) {
      switch (change.type) {
        case 'append': {
          // For appends, convert block to lines and add at the end.
          const lines = this._renderer(change.chunk, change.index);
          const lastLine = document.lineCount();
          document.replaceLines(lastLine + 1, 0, lines);
          break;
        }

        case 'update': {
          // For updates, find the block's line range and replace with new lines.
          let lineStart = 1;
          for (let i = 0; i < change.index; i++) {
            lineStart += this._chunkLineCounts.get(this._chunks[i].id)!;
          }
          const previousLineCount = this._chunkLineCounts.get(change.chunk.id)!;
          const newLines = this._renderer(change.chunk, change.index);
          document.replaceLines(lineStart, previousLineCount, newLines);
          break;
        }

        case 'delete': {
          // For deletes, find the block's line range and remove those lines.
          let lineStart = 1;
          for (let i = 0; i < change.index; i++) {
            lineStart += this._chunkLineCounts.get(this._chunks[i].id)!;
          }
          const previousLineCount = this._chunkLineCounts.get(change.id)!;
          document.replaceLines(lineStart, previousLineCount, []);
          break;
        }
      }
    }

    // Clear the line-to-block mapping.
    this._lineToChunk.clear();

    // Update all block line counts and line-to-block mapping after processing changes.
    let currentLine = 1;
    for (const [index, chunk] of this._chunks.entries()) {
      const lineCount = this._renderer(chunk, index).length;
      this._chunkLineCounts.set(chunk.id, lineCount);
      this._lineToChunk.set(currentLine, chunk);
      currentLine += lineCount;
    }

    // Clean up deleted blocks.
    const chunkIds = new Set(this._chunks.map((chunk) => chunk.id));
    for (const id of this._chunkLineCounts.keys()) {
      if (!chunkIds.has(id)) {
        this._chunkLineCounts.delete(id);
      }
    }

    // Clear changes after sync.
    this._changes.length = 0;
    return this;
  }
}
