//
// Copyright 2026 DXOS.org
//

import { type Position, type Range } from 'vscode-languageserver';

/** Converts between the character offsets the deus parsers report and the line/character positions LSP speaks. */
export class LineIndex {
  readonly #starts: number[];

  constructor(readonly text: string) {
    this.#starts = [0];
    for (let offset = 0; offset < text.length; offset++) {
      if (text[offset] === '\n') {
        this.#starts.push(offset + 1);
      }
    }
  }

  get lineCount(): number {
    return this.#starts.length;
  }

  positionAt(offset: number): Position {
    const clamped = Math.max(0, Math.min(offset, this.text.length));
    let low = 0;
    let high = this.#starts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (this.#starts[middle] <= clamped) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    return { line: low, character: clamped - this.#starts[low] };
  }

  offsetAt({ line, character }: Position): number {
    if (line >= this.#starts.length) {
      return this.text.length;
    }
    return Math.min(this.#starts[Math.max(0, line)] + character, this.lineEnd(line));
  }

  range(from: number, to: number): Range {
    return { start: this.positionAt(from), end: this.positionAt(to) };
  }

  /** The text of a 0-based line, without its newline. */
  line(line: number): string {
    return this.text.slice(this.#starts[line], this.lineEnd(line));
  }

  lineStart(line: number): number {
    return this.#starts[line];
  }

  lineEnd(line: number): number {
    const next = this.#starts[line + 1];
    return next === undefined ? this.text.length : next - 1;
  }
}

/** The 0-based range of a whole line. */
export const lineRange = (line: number, length = 0): Range => ({
  start: { line, character: 0 },
  end: { line, character: length },
});
