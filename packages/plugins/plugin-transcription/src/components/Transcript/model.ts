//
// Copyright 2025 DXOS.org
//

import { Text } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import { Event } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type Block = { id: string };

// TODO(burdon): Create adapter that listens for updates to the queue.

/**
 * Covert block to a set of markdown lines.
 */
export type BlockRenderer<T extends Block> = (block: T, debug?: boolean) => string[];

/**
 * Abstract representation of the document model.
 */
export interface BlockDocument {
  lineCount(): number;
  replaceLines(from: number, remove: number, insert: string[]): void;
}

type BlockChange<T extends Block> =
  | {
      type: 'append';
      index: number;
      block: T;
    }
  | {
      type: 'update';
      index: number;
      block: T;
    }
  | {
      type: 'delete';
      index: number;
      id: string;
    };

/**
 * Ideally we would implement a custom virtual Text model for the View, but this currently isn't possible in Codemirror.
 * Instead we use a simple model that maps blocks to lines.
 *
 * A Queue has a mutable ordered list of Blocks.
 * Each Block can be converted into a set of lines.
 * Blocks can be added, updated or deleted from the Queue.
 * A Document is an immutable projection that represents a flat list of lines corresponding to the Queue.
 */
export class BlockModel<T extends Block> {
  /** Ordered set of blocks. */
  private readonly _blocks: T[] = [];

  /** Map of block IDs to their current line counts. */
  private readonly _blockLineCounts = new Map<string, number>();

  /** Map of line numbers to block IDs. */
  private readonly _lineToBlock = new Map<number, T>();

  /** Track block changes since last sync. */
  private readonly _changes: Array<BlockChange<T>> = [];

  /** Emits when the document is updated. */
  public readonly update = new Event<void>();

  constructor(
    private readonly _renderer: BlockRenderer<T>,
    blocks: T[] = [],
  ) {
    blocks.forEach((block) => {
      this.appendBlock(block);
    });
  }

  toJSON() {
    return {
      blocks: this._blocks.length,
    };
  }

  get doc() {
    return Text.of([...this._blocks.flatMap((block) => this._renderer(block)), '']);
  }

  get blocks() {
    return this._blocks;
  }

  /**
   * Get the block ID at the given line number.
   */
  getBlockAtLine(line: number): T | undefined {
    return this._lineToBlock.get(line);
  }

  reset(): this {
    this._blocks.length = 0;
    this._blockLineCounts.clear();
    this._lineToBlock.clear();
    this.update.emit();
    return this;
  }

  appendBlock(block: T): this {
    const index = this._blocks.length;
    this._blocks.push(block);
    this._changes.push({ type: 'append', index, block });
    this.update.emit();
    return this;
  }

  updateBlock(block: T): this {
    const index = this._blocks.findIndex((b) => b.id === block.id);
    invariant(index !== -1);
    this._blocks[index] = block;
    this._changes.push({ type: 'update', index, block });
    this.update.emit();
    return this;
  }

  deleteBlock(id: string): this {
    const index = this._blocks.findIndex((b) => b.id === id);
    invariant(index !== -1);
    this._blocks.splice(index, 1);
    this._changes.push({ type: 'delete', index, id });
    this.update.emit();
    return this;
  }

  /**
   * Syncs the Document with the Queue.
   */
  sync(document: BlockDocument): this {
    log('sync', { changes: this._changes });

    // Process each change in order.
    for (const change of this._changes) {
      switch (change.type) {
        case 'append': {
          // For appends, convert block to lines and add at the end.
          const lines = this._renderer(change.block);
          const lastLine = document.lineCount();
          document.replaceLines(lastLine + 1, 0, lines);
          break;
        }

        case 'update': {
          // For updates, find the block's line range and replace with new lines.
          let lineStart = 1;
          for (let i = 0; i < change.index; i++) {
            lineStart += this._blockLineCounts.get(this._blocks[i].id)!;
          }
          const previousLineCount = this._blockLineCounts.get(change.block.id)!;
          const newLines = this._renderer(change.block);
          document.replaceLines(lineStart, previousLineCount, newLines);
          break;
        }

        case 'delete': {
          // For deletes, find the block's line range and remove those lines.
          let lineStart = 1;
          for (let i = 0; i < change.index; i++) {
            lineStart += this._blockLineCounts.get(this._blocks[i].id)!;
          }
          const previousLineCount = this._blockLineCounts.get(change.id)!;
          document.replaceLines(lineStart, previousLineCount, []);
          break;
        }
      }
    }

    // Clear the line-to-block mapping
    this._lineToBlock.clear();

    // Update all block line counts and line-to-block mapping after processing changes.
    let currentLine = 1;
    for (const block of this._blocks) {
      const lineCount = this._renderer(block).length;
      this._blockLineCounts.set(block.id, lineCount);
      this._lineToBlock.set(currentLine, block);
      currentLine += lineCount;
    }

    // Clean up deleted blocks.
    const blockIds = new Set(this._blocks.map((block) => block.id));
    for (const id of this._blockLineCounts.keys()) {
      if (!blockIds.has(id)) {
        this._blockLineCounts.delete(id);
      }
    }

    // Clear changes after sync.
    this._changes.length = 0;
    return this;
  }
}

/**
 * Codemirror document adapter.
 */
export class DocumentAdapter implements BlockDocument {
  constructor(private readonly _view: EditorView) {}

  /** The document must always have at least one line. */
  lineCount(): number {
    return this._view.state.doc.lines - 1;
  }

  replaceLines(from: number, remove: number, insert: string[]): void {
    log('replaceLines', { from, remove, insert, total: this._view.state.doc.lines });

    const numLines = this._view.state.doc.lines;
    const posFrom = this._view.state.doc.line(from).from;
    const posTo = remove === 0 ? posFrom : this._view.state.doc.line(Math.min(numLines, from + remove)).from;

    // Don't remove the last line.
    let text = insert.join('\n');
    if (posTo === this._view.state.doc.length) {
      text += '\n';
    }

    this._view.dispatch({
      changes: {
        from: posFrom,
        to: posTo,
        insert: text,
      },
    });

    // log.info('document', { lines: this._view.state.doc.lines, text: this._view.state.doc.toString() });
  }
}
