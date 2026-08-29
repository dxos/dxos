//
// Copyright 2026 DXOS.org
//

import { type KeyboardEvent, type MouseEvent, useCallback, useRef, useState } from 'react';

/**
 * The inline-edit state machine, separated from what draws it.
 *
 * `Editable` renders an `<input>`, but a markdown field wants a CodeMirror editor and a rendered
 * preview — and those live in packages that depend on this one, so they cannot be reached from
 * here. Both flavours therefore share the behaviour through this hook rather than the component:
 * one definition of what commits, what reverts, and what opens.
 */

/** What turns the preview into an editor. `dblclick` suits rows whose single click already selects. */
export type EditableActivation = 'click' | 'dblclick';

/** What a blur does with the pending edit. `Escape` always reverts and `Enter` always commits. */
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
  /** Editing state (controlled); pair with `onEditingChange` to drive it from outside. */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
};

/** Props for whatever draws the resting state, so every flavour opens the same ways. */
export type EditablePreviewBinding = {
  'role': 'button';
  'tabIndex': number;
  'aria-disabled'?: true;
  'onClick': (event: MouseEvent) => void;
  'onDoubleClick': (event: MouseEvent) => void;
  'onKeyDown': (event: KeyboardEvent) => void;
};

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
  /** Applies `blurBehavior`. */
  onBlur: () => void;
  previewProps: EditablePreviewBinding;
};

export const useEditable = ({
  value: valueProp,
  defaultValue = '',
  onValueChange,
  activation = 'click',
  blurBehavior = 'commit',
  disabled = false,
  editing: editingProp,
  onEditingChange,
}: UseEditableOptions): UseEditableReturn => {
  const [valueState, setValueState] = useState(defaultValue);
  const value = valueProp ?? valueState;

  const [editingState, setEditingState] = useState(false);
  const editing = editingProp ?? editingState;

  const [draft, setDraft] = useState(value);

  // `edit()` seeds the draft, but a host driving `editing` never calls it — so the transition is
  // watched here too, or a controlled field opens on whatever the last edit left behind.
  const wasEditing = useRef(editing);
  if (editing && !wasEditing.current) {
    setDraft(value);
  }
  wasEditing.current = editing;

  const setEditing = useCallback(
    (next: boolean) => {
      setEditingState(next);
      onEditingChange?.(next);
    },
    [onEditingChange],
  );

  const edit = useCallback(() => {
    if (disabled) {
      return;
    }
    setDraft(value);
    setEditing(true);
  }, [disabled, value, setEditing]);

  const commit = useCallback(
    (next?: string) => {
      const committed = next ?? draft;
      setEditing(false);
      setDraft(committed);
      if (committed !== value) {
        setValueState(committed);
        onValueChange?.(committed);
      }
    },
    [draft, value, onValueChange, setEditing],
  );

  const revert = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value, setEditing]);

  const onBlur = useCallback(() => (blurBehavior === 'commit' ? commit() : revert()), [blurBehavior, commit, revert]);

  const previewProps = useCallback(
    (): EditablePreviewBinding => ({
      // The affordance is a pointer one, so a keyboard reader needs the same door.
      'role': 'button',
      'tabIndex': disabled ? -1 : 0,
      'aria-disabled': disabled || undefined,
      'onClick': (event: MouseEvent) => {
        if (activation === 'click' && !event.defaultPrevented) {
          edit();
        }
      },
      'onDoubleClick': (event: MouseEvent) => {
        if (activation === 'dblclick' && !event.defaultPrevented) {
          edit();
        }
      },
      'onKeyDown': (event: KeyboardEvent) => {
        if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          edit();
        }
      },
    }),
    [activation, disabled, edit],
  )();

  return { value, draft, editing, disabled, setDraft, edit, commit, revert, onBlur, previewProps };
};
