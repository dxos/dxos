//
// Copyright 2026 DXOS.org
//

import { type KeyboardEvent, createContext, useEffect } from 'react';

/**
 * The ARIA grid pattern for list rows (AUDIT §6 point 19): the listbox is the one tab stop and zag moves its highlight;
 * ArrowRight enters the highlighted row, focusing its first control; Tab and Shift+Tab move between the row's controls;
 * Escape or ArrowLeft returns to the list. Row controls stay out of the tab order until a row is entered.
 */

const CONTROL_SELECTOR = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(', ');

const ROW_SELECTOR = '[role="option"]';

/** The row (`option`) holding `element` in this list, not in a list nested in a row's detail. */
const rowOf = (list: HTMLElement, element: Element): HTMLElement | null => {
  const row = element.closest<HTMLElement>(ROW_SELECTOR);
  return row && row.closest('[role="listbox"]') === list ? row : null;
};

const isEditable = (element: Element) =>
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(element.type)) ||
  (element instanceof HTMLElement && element.isContentEditable);

/** The focusable controls of a row, in DOM order. */
export const rowControls = (row: Element): HTMLElement[] =>
  Array.from(row.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)).filter(
    (control) =>
      !control.hidden &&
      !control.hasAttribute('disabled') &&
      control.getAttribute('aria-hidden') !== 'true' &&
      control.closest(ROW_SELECTOR) === row,
  );

/** Whether a pointer event started on one of a row's controls rather than on the row itself. */
export const isFromControl = (row: HTMLElement, target: EventTarget | null) => {
  if (!(target instanceof Element) || target === row) {
    return false;
  }
  const control = target.closest(CONTROL_SELECTOR);
  return control !== null && control !== row && row.contains(control);
};

/**
 * Keeps every row control of `list` out of the tab order (`tabindex=-1`), including controls that mount later, so the
 * list is a single tab stop. Programmatic focus still reaches them.
 */
export const useRowTabStops = (list: HTMLElement | null) => {
  useEffect(() => {
    if (!list) {
      return;
    }
    const apply = () => {
      for (const row of list.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
        if (row.closest('[role="listbox"]') !== list) {
          continue;
        }
        for (const control of rowControls(row)) {
          if (control.getAttribute('tabindex') !== '-1') {
            control.setAttribute('tabindex', '-1');
          }
        }
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ['tabindex'] });
    return () => observer.disconnect();
  }, [list]);
};

/**
 * Handles a keydown on the list before zag does. Returns `true` when zag must not see the event: the key was handled
 * here, or it came from inside a row or a row's detail, where keys belong to the focused control.
 */
export const handleGridKeyDown = (event: KeyboardEvent<HTMLElement>): boolean => {
  const list = event.currentTarget;
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target === list) {
    if (event.key !== 'ArrowRight') {
      return false;
    }
    // The active descendant: zag marks it `data-highlighted` only while it tracks focus as visible.
    const active = list.ownerDocument.getElementById(list.getAttribute('aria-activedescendant') ?? '');
    const row = active && rowOf(list, active) === active ? active : null;
    const [control] = row ? rowControls(row) : [];
    if (control) {
      event.preventDefault();
      control.focus();
    }
    return true;
  }

  const row = rowOf(list, target);
  if (!row || event.defaultPrevented) {
    return true;
  }
  if (event.key === 'Escape' || (event.key === 'ArrowLeft' && !isEditable(target))) {
    event.preventDefault();
    list.focus();
    return true;
  }
  if (event.key === 'Tab') {
    const controls = rowControls(row);
    const index = controls.findIndex((control) => control === target || control.contains(target));
    if (controls.length > 0) {
      event.preventDefault();
      const next = (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      controls[next].focus();
    }
    return true;
  }
  return true;
};

/** The id of the row's `ItemText`, so a row control (a Remove button, a disclosure caret) can name itself by it. */
export type RowContextValue = { textId: string };

export const RowContext = createContext<RowContextValue | undefined>(undefined);
