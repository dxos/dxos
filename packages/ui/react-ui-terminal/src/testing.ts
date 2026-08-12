//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { EffectEx } from '@dxos/effect';

const POLL_INTERVAL = Duration.millis(50);
const DEFAULT_TIMEOUT = Duration.seconds(15);

/**
 * Reads the terminal's visible contents as plain text.
 *
 * xterm splits a row into a span per style run and pads with non-breaking spaces, so a story cannot
 * assert against it with a plain text query — this flattens a row back to what the user sees.
 */
export const readTerminal = (element: HTMLElement): string =>
  Array.from(element.querySelectorAll('.xterm-rows > div'))
    .map((row) => (row.textContent ?? '').replace(/\u00a0/g, ' ').trimEnd())
    .join('\n');

/**
 * The hidden textarea xterm reads keystrokes from.
 */
export const getTerminalInput = (element: HTMLElement): HTMLTextAreaElement | null =>
  element.querySelector('.xterm-helper-textarea');

const pollTerminal = (element: HTMLElement, text: string): Effect.Effect<void> =>
  Effect.suspend(() =>
    readTerminal(element).includes(text)
      ? Effect.void
      : Effect.sleep(POLL_INTERVAL).pipe(Effect.flatMap(() => pollTerminal(element, text))),
  );

/**
 * Resolves once the terminal shows `text`, or throws with the current contents.
 *
 * The terminal is painted by a fiber writing into the DOM, so there is nothing to await — polling
 * is the only way to observe it. Returns a promise because a story's `play` is the boundary.
 */
export const waitForTerminal = (element: HTMLElement, text: string, timeout = DEFAULT_TIMEOUT): Promise<void> =>
  EffectEx.runPromise(
    pollTerminal(element, text).pipe(
      Effect.timeoutOrElse({
        duration: timeout,
        orElse: () =>
          Effect.fail(new Error(`Timed out waiting for "${text}". Terminal contents:\n${readTerminal(element)}`)),
      }),
    ),
  );

/**
 * Types a command and submits it.
 *
 * Waits for the input to echo before sending the return, because the shell drops keystrokes that
 * arrive before its line editor has subscribed — without this the command silently never runs.
 */
export const runCommand = async (
  element: HTMLElement,
  command: string,
  keyboard: (text: string) => Promise<unknown>,
): Promise<void> => {
  getTerminalInput(element)?.focus();
  await keyboard(command);
  await waitForTerminal(element, command);
  await keyboard('{Enter}');
};
