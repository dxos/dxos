//
// Copyright 2026 DXOS.org
//

import { userEvent, within } from 'storybook/test';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Submit a prompt through the chat's CodeMirror editor. Submission is dropped silently while the
 * runtime is still activating or a previous response is streaming, so retry until the message
 * actually shows up in the thread (the editor clearing is NOT proof of submission).
 */
export const submitPrompt = async (canvasElement: HTMLElement, text: string): Promise<void> => {
  const canvas = within(canvasElement);
  const placeholder = await canvas.findByText(/enter question or command/i, {}, { timeout: 60_000 });
  const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
  if (!editor) {
    throw new Error('Chat editor not found.');
  }

  const needle = text.slice(0, 30);
  // The prompt editor itself holds the text until it clears; any OTHER editor line containing the
  // needle (the thread renders sent messages in their own read-only CodeMirror) counts as
  // submitted. Match on `.cm-line` textContent — not leaf elements — because markdown decorations
  // (e.g. a linkified URL) split the line into child spans, and a leaf-only check then never fires.
  const promptRoot = editor.closest('.cm-editor');
  const submitted = () =>
    [...canvasElement.querySelectorAll<HTMLElement>('.cm-line')].some(
      (line) => line.closest('.cm-editor') !== promptRoot && line.textContent?.includes(needle),
    );

  // Empties the composer, so a retry typed after a slow-rendering (but successful) submit is not
  // left behind as a duplicate. Select-all is platform-keyed in CodeMirror, so try both modifiers.
  const clearEditor = async () => {
    for (const modifier of ['Control', 'Meta']) {
      if (!editor.textContent?.includes(needle)) {
        return;
      }
      await userEvent.click(editor);
      await userEvent.keyboard(`{${modifier}>}a{/${modifier}}{Backspace}`);
    }
  };

  for (let attempt = 0; attempt < 20; attempt++) {
    // A prior attempt may have submitted with the thread rendering past that attempt's window; a
    // blind re-type would then double-enter the prompt (and its Enter is dropped while the agent
    // streams, stranding the duplicate in the composer) — so re-check before touching the editor.
    if (submitted()) {
      await clearEditor();
      return;
    }
    if (!editor.textContent?.includes(needle)) {
      await userEvent.click(editor);
      await userEvent.type(editor, text);
    }
    await userEvent.keyboard('{Enter}');
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (submitted()) {
        await clearEditor();
        return;
      }
      await sleep(500);
    }
  }
  throw new Error('Prompt did not reach the thread.');
};
