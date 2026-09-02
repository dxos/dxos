//
// Copyright 2026 DXOS.org
//

import { type UseEditableReturn as EditableApi, useEditable as useMachine } from '@ark-ui/react/editable';
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * The inline-edit state machine — `@ark-ui/react`'s Editable (zag) — behind DXOS's own contract.
 *
 * `Editable` renders an `<input>`, but a markdown field wants a CodeMirror editor and a rendered
 * preview — and those live in packages that depend on this one, so they cannot be reached from
 * here. Both flavours therefore share the behaviour through this hook rather than the component:
 * one definition of what commits, what reverts, and what opens.
 *
 * The machine owns the pending text, which state the field is in, the activation gesture, `Enter` /
 * `Escape`, and what an interaction outside the field does with the edit. This adds the one thing it
 * has no notion of: a committed value distinct from the pending one, so `onValueChange` fires when
 * an edit lands rather than on every keystroke.
 */

/** What turns the preview into an editor. `dblclick` suits rows whose single click already selects. */
export type EditableActivation = 'click' | 'dblclick' | 'focus' | 'none';

/** What an interaction outside does with the pending edit. `Escape` always reverts and `Enter` always commits. */
export type EditableBlurBehavior = 'commit' | 'revert';

export type UseEditableOptions = {
  /** Current text (controlled). */
  value?: string;
  /** Initial text when uncontrolled. */
  defaultValue?: string;
  /** Called when an edit is committed — never while typing, so a keystroke is not a write. */
  onValueChange?: (value: string) => void;
  activation?: EditableActivation;
  blurBehavior?: EditableBlurBehavior;
  disabled?: boolean;
  /** Shown, dimmed, when the value is empty. */
  placeholder?: string;
  /** Editing state (controlled); pair with `onEditingChange` to drive it from outside. */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
};

/** Props for whatever draws the resting state, so every flavour opens the same ways. */
export type EditablePreviewBinding = ReturnType<EditableApi['getPreviewProps']>;

export type UseEditableReturn = {
  value: string;
  /** The pending text; separate from `value` so `Escape` has something to revert to. */
  draft: string;
  editing: boolean;
  disabled: boolean;
  setDraft: (draft: string) => void;
  edit: () => void;
  /** Commits `next` when given: a caller that already holds the text must not race the draft state. */
  commit: (next?: string) => void;
  revert: () => void;
  previewProps: EditablePreviewBinding;
  /** The machine itself, for the parts that render Ark's own anatomy. */
  api: EditableApi;
};

export const useEditable = ({
  value: valueProp,
  defaultValue = '',
  onValueChange,
  activation = 'click',
  blurBehavior = 'commit',
  disabled = false,
  placeholder,
  editing: editingProp,
  onEditingChange,
}: UseEditableOptions): UseEditableReturn => {
  const [valueState, setValueState] = useState(defaultValue);
  const value = valueProp ?? valueState;

  // The machine's callbacks are handed to it once, so they read the committed text through a ref
  // rather than closing over whichever render created them.
  const committed = useRef(value);
  committed.current = value;
  const apiRef = useRef<EditableApi | null>(null);

  const api = useMachine({
    defaultValue: value,
    placeholder,
    activationMode: activation,
    submitMode: blurBehavior === 'commit' ? 'both' : 'enter',
    // Caret at the end rather than a selection: opening a title is usually the start of amending it,
    // and a select-all turns the next keystroke into a silent delete of the whole value.
    selectOnFocus: false,
    disabled,
    edit: editingProp,
    onEditChange: ({ edit }) => onEditingChange?.(edit),
    onValueCommit: ({ value: next }) => {
      if (next === committed.current) {
        return;
      }
      setValueState(next);
      onValueChange?.(next);
    },
    // The machine's own revert keeps whatever it holds when the text it opened with was empty, so
    // `Escape` on a field showing its placeholder would keep the discarded text instead.
    onValueRevert: () => apiRef.current?.setValue(committed.current),
  });
  apiRef.current = api;

  // A value that changed elsewhere — a peer's edit, a controlled parent refusing a commit — has to
  // reach the machine, which otherwise holds the one it was seeded with. Never mid-edit: that would
  // overwrite what is being typed.
  useEffect(() => {
    if (!api.editing && api.value !== value) {
      api.setValue(value);
    }
  }, [api, value]);

  const setDraft = useCallback((draft: string) => api.setValue(draft), [api]);

  const commit = useCallback(
    (next?: string) => {
      if (next !== undefined) {
        api.setValue(next);
      }
      api.submit();
    },
    [api],
  );

  const previewProps = useMemo<EditablePreviewBinding>(
    () => ({
      ...api.getPreviewProps(),
      // The machine names the preview "edit", which is what the gesture does rather than what the
      // field holds — in a list of rows that is every row with the same name.
      'aria-label': undefined,
      // The affordance is a pointer one, so a keyboard reader needs the same door; the machine opens
      // on focus alone, which a field that a single click already opens must not do.
      'role': 'button',
      'onKeyDown': (event: KeyboardEvent) => {
        if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          api.edit();
        }
      },
    }),
    [api],
  );

  return {
    value,
    draft: api.value,
    editing: api.editing,
    disabled,
    setDraft,
    edit: api.edit,
    commit,
    revert: api.cancel,
    previewProps,
    api,
  };
};
