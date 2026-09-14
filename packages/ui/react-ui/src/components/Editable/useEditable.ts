//
// Copyright 2026 DXOS.org
//

import { type UseEditableReturn as EditableApi, useEditable as useMachine } from '@ark-ui/react/editable';
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// The inline-edit state machine — `@ark-ui/react`'s Editable (zag) — behind DXOS's own contract.
//
// `Editable` renders an `<input>`, but a markdown field wants a CodeMirror editor and a rendered
// preview — and those live in packages that depend on this one, so they cannot be reached from
// here. Both flavours therefore share the behaviour through this hook rather than the component:
// one definition of what commits, what reverts, and what opens.

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

/**
 * What the preview needs beyond the machine's own props. Empty when the machine already answers the
 * keyboard on its own.
 */
export type EditableActivationBinding = {
  role?: 'button';
  onKeyDown?: (event: KeyboardEvent) => void;
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
  previewProps: EditablePreviewBinding;
  /**
   * The keyboard door, for a part that renders the machine's own preview and so already has the
   * rest of {@link UseEditableReturn.previewProps} applied to it.
   */
  activationProps: EditableActivationBinding;
  /** The machine itself, for the parts that render Ark's own anatomy. */
  api: EditableApi;
};

/**
 * Inline edit: text that becomes editable in place, with a committed value distinct from the
 * pending one.
 *
 * The machine owns the pending text, which state the field is in, the activation gesture, `Enter` /
 * `Escape`, and what an interaction outside the field does with the edit. This owns the thing it has
 * no notion of — the committed value — so `onValueChange` fires when an edit lands rather than on
 * every keystroke.
 *
 * **The value.** Controlled with `value`, uncontrolled with `defaultValue`; `draft` is the pending
 * text either way and only ever reaches `onValueChange` on a commit. A controlled host that does not
 * echo a commit back is refusing it, and the field returns to the value the host still holds.
 *
 * **Who owns the edit state.** Left alone, the machine does: the field opens on `activation` and
 * closes on `Enter`, `Escape`, or an interaction outside it. Passing `editing` takes that ownership,
 * which is what a pane editor does — the pane IS the editor, so it is held open and never closes.
 * The machine then treats a submit as a request to whoever holds the prop and announces only the
 * state change, so `commit` and `revert` here act on it directly rather than waiting to be told.
 * Either way an edit is delivered exactly once.
 *
 * **Commit and revert.** `commit` writes the pending text — or the text it is handed, for a caller
 * that already holds it and must not race the draft. `revert` restores the last committed text and
 * discards the rest, including on a field that was empty when it opened, which the machine alone
 * would leave holding the discarded text.
 */
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
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  /**
   * The one way an edit lands, whether the machine announced it or a caller asked for it directly.
   *
   * Idempotent on the text it already holds, so the two routes can both run in a tick without
   * writing twice: `committed` is advanced here rather than waiting for the render that reads the
   * prop back.
   */
  const deliver = useCallback((next: string) => {
    if (next === committed.current) {
      return;
    }
    committed.current = next;
    setValueState(next);
    onValueChangeRef.current?.(next);
  }, []);

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
    onValueCommit: ({ value: next }) => deliver(next),
    // The machine's own revert keeps whatever it holds when the text it opened with was empty, so
    // `Escape` on a field showing its placeholder would keep the discarded text instead. Restored
    // inside the machine's own transition rather than left to the reconciling effect below, which
    // would catch it a render later — after the discarded text had been drawn once.
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

  /**
   * Commits, and delivers the edit rather than trusting the machine to announce it.
   *
   * A field whose editing state is controlled never leaves edit on its own, so the machine treats
   * `SUBMIT` as a request to the host and reports only the state change — `onValueCommit` never
   * runs. A pane held open that way is the whole point of driving `editing` from outside, and its
   * text would never be written.
   */
  const commit = useCallback(
    (next?: string) => {
      const text = next ?? api.value;
      api.setValue(text);
      api.submit();
      deliver(text);
    },
    [api, deliver],
  );

  /** Reverts for the same reason `commit` delivers: a controlled field never reaches the machine's own cancel. */
  const revert = useCallback(() => {
    api.setValue(committed.current);
    api.cancel();
  }, [api]);

  // A gesture the machine only takes from a pointer needs the same door for a keyboard reader. Its
  // own keyboard answer is `focus` activation, which is wrong for a field a single click opens —
  // tabbing across a list of them would put every row into edit on the way past.
  const activationProps = useMemo<EditableActivationBinding>(() => {
    if (activation !== 'click' && activation !== 'dblclick') {
      return {};
    }

    return {
      role: 'button',
      onKeyDown: (event: KeyboardEvent) => {
        if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          api.edit();
        }
      },
    };
  }, [activation, api]);

  const previewProps = useMemo<EditablePreviewBinding>(
    () => ({
      ...api.getPreviewProps(),
      // The machine names the preview "edit", which is what the gesture does rather than what the
      // field holds — in a list of rows that is every row with the same name.
      'aria-label': undefined,
      ...activationProps,
    }),
    [api, activationProps],
  );

  return {
    value,
    draft: api.value,
    editing: api.editing,
    disabled,
    setDraft,
    edit: api.edit,
    commit,
    revert,
    previewProps,
    activationProps,
    api,
  };
};
