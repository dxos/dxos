//
// Copyright 2026 DXOS.org
//

const POLL_INTERVAL = 50;
const DEFAULT_TIMEOUT = 15_000;

/**
 * Reads the terminal's visible contents as plain text.
 *
 * xterm splits a row into a span per style run and pads with non-breaking spaces, so a story cannot
 * assert against it with a plain text query — this flattens a row back to what the user sees.
 */
export const readTerminal = (element: HTMLElement): string =>
  Array.from(element.querySelectorAll('.xterm-rows > div'))
    .map((row) => (row.textContent ?? '').replace(/ /g, ' ').trimEnd())
    .join('\n');

/**
 * The hidden textarea xterm reads keystrokes from.
 */
export const getTerminalInput = (element: HTMLElement): HTMLTextAreaElement | null =>
  element.querySelector('.xterm-helper-textarea');

/**
 * Resolves once the terminal shows `text`, or throws with the current contents.
 */
export const waitForTerminal = async (element: HTMLElement, text: string, timeout = DEFAULT_TIMEOUT): Promise<void> => {
  const deadline = Date.now() + timeout;
  do {
    if (readTerminal(element).includes(text)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  } while (Date.now() < deadline);

  throw new Error(`Timed out waiting for "${text}". Terminal contents:\n${readTerminal(element)}`);
};

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
