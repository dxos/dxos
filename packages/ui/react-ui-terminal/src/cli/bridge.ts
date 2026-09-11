//
// Copyright 2026 DXOS.org
//

import type { IDisposable, Terminal as XtermTerminal } from '@xterm/xterm';
import type * as Terminal from 'effect/Terminal';

import { decodeInput } from './input.ts';

export type InputHandler = (input: Terminal.UserInput) => void;

/**
 * The surface the shell and the Effect `Terminal` service need from a terminal: a write sink and a
 * stack of keypress subscribers. Depending on this rather than the xterm class keeps the rest of
 * this module free of any renderer.
 */
export interface TerminalBridge {
  readonly columns: number;
  readonly rows: number;
  readonly atLineStart: boolean;
  write(text: string): void;
  clear(): void;
  subscribe(handler: InputHandler): () => void;
}

/**
 * Adapts an xterm instance to {@link TerminalBridge}.
 */
export class XtermBridge implements TerminalBridge {
  #terminal: XtermTerminal;
  #subscribers: InputHandler[] = [];
  #subscription: IDisposable;
  #atLineStart = true;

  constructor(terminal: XtermTerminal) {
    this.#terminal = terminal;
    this.#subscription = terminal.onData((data) => this.#handleData(data));
  }

  get columns(): number {
    return this.#terminal.cols;
  }

  get rows(): number {
    return this.#terminal.rows;
  }

  /**
   * Whether the cursor sits at the start of a row, so callers can avoid a blank line when a command
   * has already terminated its output with a newline.
   */
  get atLineStart(): boolean {
    return this.#atLineStart;
  }

  /**
   * Writes text, translating bare newlines to CRLF since xterm does not reset the column on `\n`.
   */
  write(text: string): void {
    if (text.length === 0) {
      return;
    }

    this.#terminal.write(text.replace(/\r?\n/g, '\r\n'));
    this.#atLineStart = text.endsWith('\n');
  }

  clear(): void {
    this.#terminal.write('\x1b[2J\x1b[H');
    this.#atLineStart = true;
  }

  /**
   * Subscribes to keypresses. The most recent subscriber wins, so a prompt opened by a running
   * command takes over from the shell's line editor and hands back when its scope closes.
   */
  subscribe(handler: InputHandler): () => void {
    this.#subscribers.push(handler);
    return () => {
      const index = this.#subscribers.indexOf(handler);
      if (index !== -1) {
        this.#subscribers.splice(index, 1);
      }
    };
  }

  dispose(): void {
    this.#subscription.dispose();
    this.#subscribers.length = 0;
  }

  #handleData(data: string): void {
    const handler = this.#subscribers.at(-1);
    if (!handler) {
      return;
    }

    for (const input of decodeInput(data)) {
      handler(input);
    }
  }
}
