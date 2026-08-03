//
// Copyright 2026 DXOS.org
//

import { type InputHandler, type TerminalBridge } from './bridge';
import { decodeInput } from './input';

/**
 * A bridge that records writes and lets a test push keystrokes, standing in for xterm.
 */
export class TestBridge implements TerminalBridge {
  readonly columns = 80;
  readonly rows = 24;
  readonly writes: string[] = [];

  #handlers: InputHandler[] = [];
  #atLineStart = true;

  get atLineStart(): boolean {
    return this.#atLineStart;
  }

  get rendered(): string {
    return this.writes.join('');
  }

  write(text: string): void {
    this.writes.push(text);
    this.#atLineStart = text.endsWith('\n');
  }

  clear(): void {
    this.writes.push('<clear>');
  }

  subscribe(handler: InputHandler): () => void {
    this.#handlers.push(handler);
    return () => {
      this.#handlers = this.#handlers.filter((entry) => entry !== handler);
    };
  }

  /**
   * Feeds raw terminal data through the real decoder, so tests exercise the same path as xterm.
   */
  send(data: string): void {
    for (const input of decodeInput(data)) {
      this.#handlers.at(-1)?.(input);
    }
  }
}
