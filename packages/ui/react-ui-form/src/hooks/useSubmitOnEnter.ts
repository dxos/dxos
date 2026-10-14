//
// Copyright 2026 DXOS.org
//

import { type RefObject, useEffect, useRef } from 'react';

import { addEventListener } from '@dxos/async';

/** Input types whose Enter carries no meaning of its own, as in a native `<form>`'s implicit submission. */
const SINGLE_LINE_INPUT_TYPES = new Set(['', 'text', 'search', 'email', 'url', 'tel', 'password', 'number']);

const isSingleLineInput = (target: EventTarget | null): target is HTMLInputElement =>
  target instanceof HTMLInputElement &&
  SINGLE_LINE_INPUT_TYPES.has(target.type) &&
  // An autocompleting input (combobox, ref picker) spends Enter on choosing an option.
  !target.hasAttribute('aria-autocomplete') &&
  target.getAttribute('role') !== 'combobox';

export type SubmitOnEnterOptions = {
  disabled?: boolean;
};

/**
 * Calls `onSubmit` on a plain Enter in a single-line input inside `elRef`, the implicit submission a
 * native `<form>` gives; multi-line fields (textarea, markdown editors) and modified Enter keep their own meaning.
 */
export const useSubmitOnEnter = (
  elRef: RefObject<HTMLElement | null>,
  onSubmit: () => void,
  { disabled }: SubmitOnEnterOptions = {},
) => {
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    const el = elRef.current;
    if (!el || disabled) {
      return;
    }

    // On the document, in the bubble phase, so a field that handles Enter itself (and says so with
    // `preventDefault`) has already run; content portaled out of `el` (popovers) is never a target.
    return addEventListener(el.ownerDocument, 'keydown', (event: KeyboardEvent) => {
      if (
        event.key !== 'Enter' ||
        event.defaultPrevented ||
        event.isComposing ||
        // Safari ends an IME composition with an Enter whose `isComposing` is false but `keyCode` is 229.
        event.keyCode === 229 ||
        event.shiftKey ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        !isSingleLineInput(event.target) ||
        !el.contains(event.target)
      ) {
        return;
      }

      event.preventDefault();
      onSubmitRef.current();
    });
  }, [elRef, disabled]);
};
