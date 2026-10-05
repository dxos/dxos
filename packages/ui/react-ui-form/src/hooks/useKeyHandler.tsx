//
// Copyright 2025 DXOS.org
//

import { type RefObject, useCallback, useLayoutEffect } from 'react';

import { addEventListener } from '@dxos/async';

import { type FormHandler } from './useFormHandler.ts';

/**
 * Cmd+Enter on macOS, Ctrl+Enter elsewhere; both are accepted everywhere, as GitHub's forms do.
 * Not while an IME is composing, where the chord confirms the text being composed.
 */
const isSubmitChord = (event: KeyboardEvent) =>
  event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && !event.isComposing;

export type KeyHandlerOptions = {
  /** A readonly form has nothing to submit, so the chord passes through to whatever holds focus. */
  readonly?: boolean;
};

/**
 * Submits the form on Cmd/Ctrl+Enter from any field, including multi-line ones.
 */
export const useKeyHandler = (
  elRef: RefObject<HTMLDivElement | null>,
  form: FormHandler<any>,
  { readonly }: KeyHandlerOptions = {},
) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // An auto-saving form has no submit for the chord to mean.
      if (!isSubmitChord(event) || readonly || form.autoSave) {
        return;
      }

      // Capture runs outermost first, so a nested form's chord must be left to that form.
      const owner = event.target instanceof Element ? event.target.closest('[role="form"]') : null;
      if (owner !== event.currentTarget) {
        return;
      }

      // Consumed even when nothing is saved, so a field's own binding (CodeMirror's Mod-Enter inserts
      // a blank line) never runs in its place.
      event.preventDefault();
      event.stopPropagation();

      // `isValid` as well as `canSave`: a required field the reader never touched carries no visible
      // error, so `canSave` alone would submit an empty form.
      if (form.canSave && form.isValid) {
        form.onSave();
      }
    },
    [readonly, form.autoSave, form.isValid, form.canSave, form.onSave],
  );

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) {
      return;
    }

    // Capture phase, so the form sees the chord before the focused field's own key handling.
    return addEventListener(el, 'keydown', handleKeyDown, { capture: true });
  }, [elRef, handleKeyDown]);
};
