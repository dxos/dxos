//
// Copyright 2026 DXOS.org
//

import { userEvent, waitFor } from 'storybook/test';

//
// Addressing `Form` fields from a play function.
//
// A form consumer knows a field by its schema-declared label, not by a test id — and `Form` renders the
// label and the control as siblings under a field container, so these walk out from the label rather
// than assuming a fixed nesting depth or that every themed control adopts the label's `for` target.
//

const CONTROL = 'input, textarea, [role="switch"], [role="combobox"]';

/** The control of the field carrying the given label. */
export const control = <T extends HTMLElement>(root: HTMLElement, label: string): T => {
  const labelNode = Array.from(root.querySelectorAll<HTMLElement>('label, span')).find(
    (candidate) => candidate.textContent === label,
  );
  if (!labelNode) {
    throw new Error(`No field labelled "${label}".`);
  }

  // Test the boundary BEFORE querying: querying `root` itself searches the whole panel and returns
  // the first control in document order, which usually belongs to a different field.
  for (let node = labelNode.parentElement; node && node !== root; node = node.parentElement) {
    const found = node.querySelector<T>(CONTROL);
    if (found) {
      return found;
    }
  }

  throw new Error(`Field "${label}" has no control.`);
};

/** The value shown on a select field's trigger — the schema value (`in-progress`). */
export const selectValue = (root: HTMLElement, label: string): string => control(root, label).textContent ?? '';

/**
 * Choose an option in a select field, by its schema value.
 *
 * The options render in a portal outside the story canvas, so they are found on `document.body`.
 */
export const selectOption = async (root: HTMLElement, label: string, option: string): Promise<void> => {
  const trigger = control(root, label);
  await userEvent.click(trigger);
  const item = await waitFor(() => {
    const options = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]'));
    const found = options.find((candidate) => candidate.textContent?.trim() === option);
    if (!found) {
      throw new Error(
        `No option "${option}" for "${label}" (open=${trigger.getAttribute('aria-expanded')}, offered ${JSON.stringify(options.map((node) => node.textContent))}).`,
      );
    }
    return found;
  });
  await userEvent.click(item);
};

/** Replace the text of a field and commit it — `autoSave` writes on blur. */
export const typeInto = async (root: HTMLElement, label: string, text: string): Promise<void> => {
  const input = control<HTMLInputElement>(root, label);
  await userEvent.clear(input);
  await userEvent.type(input, text);
  await userEvent.tab();
};
