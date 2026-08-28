//
// Copyright 2026 DXOS.org
//

// `Editable` — text that becomes an input in place ("inline edit" / "click-to-edit").
//
//   <Editable.Root value={title} onValueChange={setTitle} placeholder='Untitled'>
//     <Editable.Preview />
//     <Editable.Input />
//   </Editable.Root>
//
// - `Root` — headless; owns the value (controlled or uncontrolled) and whether it is editing.
// - `Preview` — the static text, and the activation affordance.
// - `Input` — the field shown while editing; autofocuses and selects.
//
// The two render into ONE grid cell so the box never changes size between them, and they share
// their metrics through the theme (see `Editable.theme.ts`). A row containing one of these must not
// move when the reader clicks it.

import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon } from '../Icon';

const EDITABLE_NAME = 'Editable.Root';
const EDITABLE_PREVIEW_NAME = 'Editable.Preview';
const EDITABLE_INPUT_NAME = 'Editable.Input';

/** What turns the preview into an input. `dblclick` suits rows whose single click already selects. */
export type EditableActivation = 'click' | 'dblclick';

/** What a blur does with the pending edit. `Escape` always reverts and `Enter` always commits. */
export type EditableBlurBehavior = 'commit' | 'revert';

type EditableContextValue = {
  value: string;
  draft: string;
  editing: boolean;
  disabled: boolean;
  placeholder?: string;
  activation: EditableActivation;
  setDraft: (draft: string) => void;
  edit: () => void;
  commit: () => void;
  revert: () => void;
  onBlur: () => void;
};

const [EditableProvider, useEditableContext] = createContext<EditableContextValue>(EDITABLE_NAME);

//
// Root — headless context provider; renders the grid the two parts share.
//

type EditableRootProps = ThemedClassName<
  PropsWithChildren<{
    /** Current text (controlled). */
    value?: string;
    /** Initial text when uncontrolled. */
    defaultValue?: string;
    /** Called when an edit is committed — never while typing, so a keystroke is not a write. */
    onValueChange?: (value: string) => void;
    /** Shown, dimmed, when the value is empty. */
    placeholder?: string;
    activation?: EditableActivation;
    blurBehavior?: EditableBlurBehavior;
    disabled?: boolean;
    /** Editing state (controlled); pair with `onEditingChange` to drive it from outside. */
    editing?: boolean;
    onEditingChange?: (editing: boolean) => void;
  }>
>;

const EditableRoot = forwardRef<HTMLDivElement, EditableRootProps>(
  (
    {
      children,
      classNames,
      value: valueProp,
      defaultValue = '',
      onValueChange,
      placeholder,
      activation = 'click',
      blurBehavior = 'commit',
      disabled = false,
      editing: editingProp,
      onEditingChange,
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const [valueState, setValueState] = useState(defaultValue);
    const value = valueProp ?? valueState;

    const [editingState, setEditingState] = useState(false);
    const editing = editingProp ?? editingState;

    // The draft is separate from the value so `Escape` has something to revert to, and so a
    // keystroke never reaches the consumer — `onValueChange` fires on commit only.
    const [draft, setDraft] = useState(value);

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

    const commit = useCallback(() => {
      setEditing(false);
      if (draft !== value) {
        setValueState(draft);
        onValueChange?.(draft);
      }
    }, [draft, value, onValueChange, setEditing]);

    const revert = useCallback(() => {
      setDraft(value);
      setEditing(false);
    }, [value, setEditing]);

    const onBlur = useCallback(() => (blurBehavior === 'commit' ? commit() : revert()), [blurBehavior, commit, revert]);

    return (
      <EditableProvider
        value={value}
        draft={draft}
        editing={editing}
        disabled={disabled}
        placeholder={placeholder}
        activation={activation}
        setDraft={setDraft}
        edit={edit}
        commit={commit}
        revert={revert}
        onBlur={onBlur}
      >
        <div className={tx('editable.root', { editing, disabled }, classNames)} ref={forwardedRef}>
          {children}
        </div>
      </EditableProvider>
    );
  },
);

EditableRoot.displayName = EDITABLE_NAME;

//
// Preview — the static text. Renders nothing while editing, so the input takes the cell.
//

type EditablePreviewProps = ThemedClassName<Omit<ComponentPropsWithRef<'div'>, 'children'>>;

const EditablePreview = forwardRef<HTMLDivElement, EditablePreviewProps>(
  ({ classNames, onClick, onDoubleClick, onKeyDown, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { value, editing, disabled, placeholder, activation, edit } = useEditableContext(EDITABLE_PREVIEW_NAME);

    const handleActivate = useCallback(() => !disabled && edit(), [disabled, edit]);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          handleActivate();
        }
      },
      [onKeyDown, handleActivate],
    );

    if (editing) {
      return null;
    }

    return (
      <div
        {...props}
        // Focusable and Enter/Space-activated: the affordance is a pointer one, and a keyboard
        // reader needs the same door.
        role='button'
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        data-testid='editable.preview'
        className={tx('editable.preview', { disabled, placeholder: !value }, classNames)}
        onClick={(event) => {
          onClick?.(event);
          if (activation === 'click' && !event.defaultPrevented) {
            handleActivate();
          }
        }}
        onDoubleClick={(event) => {
          onDoubleClick?.(event);
          if (activation === 'dblclick' && !event.defaultPrevented) {
            handleActivate();
          }
        }}
        onKeyDown={handleKeyDown}
        ref={forwardedRef}
      >
        <span className='truncate'>{value || placeholder}</span>
        {/* Pushed to the trailing edge: the affordance belongs to the row, not to the text, so it
            does not move as the title's length changes. */}
        <span className='grow' />
        <Icon icon='ph--pencil-simple--regular' size={4} classNames={tx('editable.previewIcon', {})} />
      </div>
    );
  },
);

EditablePreview.displayName = EDITABLE_PREVIEW_NAME;

//
// Input — shown while editing; autofocuses and selects so typing replaces.
//

type EditableInputProps = ThemedClassName<Omit<ComponentPropsWithRef<'input'>, 'value' | 'onChange' | 'placeholder'>>;

const EditableInput = forwardRef<HTMLInputElement, EditableInputProps>(
  ({ classNames, onKeyDown, onBlur: onBlurProp, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { draft, editing, placeholder, setDraft, commit, revert, onBlur } = useEditableContext(EDITABLE_INPUT_NAME);
    const localRef = useRef<HTMLInputElement>(null);

    // Caret at the end rather than a selection: opening a title is usually the start of amending it,
    // and a select-all turns the next keystroke into a silent delete of the whole value.
    useEffect(() => {
      const element = localRef.current;
      if (editing && element) {
        element.focus();
        const end = element.value.length;
        element.setSelectionRange(end, end);
      }
    }, [editing]);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) {
          return;
        }
        switch (event.key) {
          case 'Enter':
            event.preventDefault();
            commit();
            break;
          case 'Escape':
            // Stopped as well as prevented: an editing row inside a dialog must not close it.
            event.preventDefault();
            event.stopPropagation();
            revert();
            break;
        }
      },
      [onKeyDown, commit, revert],
    );

    const handleBlur = useCallback(
      (event: FocusEvent<HTMLInputElement>) => {
        onBlurProp?.(event);
        onBlur();
      },
      [onBlurProp, onBlur],
    );

    if (!editing) {
      return null;
    }

    return (
      <input
        {...props}
        data-testid='editable.input'
        className={tx('editable.input', {}, classNames)}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        ref={(element) => {
          localRef.current = element;
          if (typeof forwardedRef === 'function') {
            forwardedRef(element);
          } else if (forwardedRef) {
            forwardedRef.current = element;
          }
        }}
      />
    );
  },
);

EditableInput.displayName = EDITABLE_INPUT_NAME;

export const Editable = {
  Root: EditableRoot,
  Preview: EditablePreview,
  Input: EditableInput,
};

export { useEditableContext };

export type { EditableInputProps, EditablePreviewProps, EditableRootProps };
