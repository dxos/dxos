//
// Copyright 2026 DXOS.org
//

import * as Terminal from '@effect/platform/Terminal';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import type { XtermBridge } from './bridge';

export type LineResult =
  | { readonly type: 'line'; readonly value: string }
  | { readonly type: 'cancelled' }
  | { readonly type: 'eof' };

export type ReadLineOptions = {
  /**
   * Rendered before the editable buffer and redrawn on every keystroke.
   */
  prompt?: string;
  /**
   * Previously entered lines, oldest first. Mutated by the caller between reads; the editor only
   * reads it.
   */
  history?: ReadonlyArray<string>;
};

/**
 * Reads a single line, echoing keystrokes and supporting inline editing, history recall, and the
 * common readline control chords.
 *
 * Distinguishes cancellation (Ctrl-C) from end-of-input (Ctrl-D on an empty buffer) so a shell can
 * abandon the current line without exiting.
 */
export const readLineResult = (bridge: XtermBridge, options: ReadLineOptions = {}): Effect.Effect<LineResult> =>
  Effect.async<LineResult>((resume) => {
    const { prompt = '', history = [] } = options;

    let buffer = '';
    let cursor = 0;
    let historyIndex = history.length;
    let draft = '';

    // Redraws the whole row; a buffer long enough to wrap will not repaint correctly.
    const render = () => {
      const trailing = buffer.length - cursor;
      bridge.write(`\r\x1b[K${prompt}${buffer}${trailing > 0 ? `\x1b[${trailing}D` : ''}`);
    };

    const finish = (result: LineResult) => {
      unsubscribe();
      resume(Effect.succeed(result));
    };

    const recall = (index: number) => {
      if (historyIndex === history.length) {
        draft = buffer;
      }

      historyIndex = index;
      buffer = index === history.length ? draft : history[index];
      cursor = buffer.length;
      render();
    };

    const unsubscribe = bridge.subscribe((input) => {
      const { key } = input;

      if (key.ctrl) {
        switch (key.name) {
          case 'c': {
            bridge.write('^C\n');
            finish({ type: 'cancelled' });
            return;
          }
          case 'd': {
            if (buffer.length === 0) {
              bridge.write('\n');
              finish({ type: 'eof' });
            }
            return;
          }
          case 'a': {
            cursor = 0;
            render();
            return;
          }
          case 'e': {
            cursor = buffer.length;
            render();
            return;
          }
          case 'u': {
            buffer = buffer.slice(cursor);
            cursor = 0;
            render();
            return;
          }
          case 'k': {
            buffer = buffer.slice(0, cursor);
            render();
            return;
          }
          case 'l': {
            bridge.clear();
            render();
            return;
          }
          default:
            return;
        }
      }

      switch (key.name) {
        case 'return': {
          bridge.write('\n');
          finish({ type: 'line', value: buffer });
          return;
        }
        case 'backspace': {
          if (cursor > 0) {
            buffer = buffer.slice(0, cursor - 1) + buffer.slice(cursor);
            cursor -= 1;
            render();
          }
          return;
        }
        case 'delete': {
          if (cursor < buffer.length) {
            buffer = buffer.slice(0, cursor) + buffer.slice(cursor + 1);
            render();
          }
          return;
        }
        case 'left': {
          if (cursor > 0) {
            cursor -= 1;
            render();
          }
          return;
        }
        case 'right': {
          if (cursor < buffer.length) {
            cursor += 1;
            render();
          }
          return;
        }
        case 'home': {
          cursor = 0;
          render();
          return;
        }
        case 'end': {
          cursor = buffer.length;
          render();
          return;
        }
        case 'up': {
          if (historyIndex > 0) {
            recall(historyIndex - 1);
          }
          return;
        }
        case 'down': {
          if (historyIndex < history.length) {
            recall(historyIndex + 1);
          }
          return;
        }
        case 'escape':
        case 'tab':
          return;
      }

      Option.match(input.input, {
        onNone: () => {},
        onSome: (char) => {
          buffer = buffer.slice(0, cursor) + char + buffer.slice(cursor);
          cursor += char.length;
          render();
        },
      });
    });

    render();

    return Effect.sync(unsubscribe);
  });

/**
 * The `Terminal` service contract: a line, or a `QuitException` for either interrupt.
 */
export const readLine = (bridge: XtermBridge, options: ReadLineOptions = {}) =>
  readLineResult(bridge, options).pipe(
    Effect.flatMap((result) =>
      result.type === 'line' ? Effect.succeed(result.value) : Effect.fail(new Terminal.QuitException()),
    ),
  );
