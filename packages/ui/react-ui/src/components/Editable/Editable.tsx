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
} from 'react';

import { useThemeContext } from '../../hooks/index.ts';
import { type ThemedClassName } from '../../util/index.ts';
import { Icon } from '../Icon/index.ts';
import {
  type EditableActivation,
  type EditableBlurBehavior,
  type UseEditableOptions,
  type UseEditableReturn,
  useEditable,
} from './useEditable.ts';

const EDITABLE_NAME = 'Editable.Root';
const EDITABLE_PREVIEW_NAME = 'Editable.Preview';
const EDITABLE_INPUT_NAME = 'Editable.Input';

type EditableContextValue = UseEditableReturn & { placeholder?: string };

const [EditableProvider, useEditableContext] = createContext<EditableContextValue>(EDITABLE_NAME);

//
// Root — headless context provider; renders the grid the two parts share.
//

type EditableRootProps = ThemedClassName<
  PropsWithChildren<
    UseEditableOptions & {
      /** Shown, dimmed, when the value is empty. */
      placeholder?: string;
    }
  >
>;

const EditableRoot = forwardRef<HTMLDivElement, EditableRootProps>(
  ({ children, classNames, placeholder, ...options }, forwardedRef) => {
    const { tx } = useThemeContext();
    const editable = useEditable(options);

    return (
      <EditableProvider {...editable} placeholder={placeholder}>
        <div
          className={tx('editable.root', { editing: editable.editing, disabled: editable.disabled }, classNames)}
          ref={forwardedRef}
        >
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

const EditablePreview = forwardRef<HTMLDivElement, EditablePreviewProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { value, editing, disabled, placeholder, previewProps } = useEditableContext(EDITABLE_PREVIEW_NAME);

  if (editing) {
    return null;
  }

  return (
    <div
      {...props}
      {...previewProps}
      data-testid='editable.preview'
      className={tx('editable.preview', { disabled, placeholder: !value }, classNames)}
      ref={forwardedRef}
    >
      <span className='truncate'>{value || placeholder}</span>
      {/* Pushed to the trailing edge: the affordance belongs to the row, not to the text, so it
            does not move as the title's length changes. */}
      <span className='grow' />
      <Icon icon='ph--pencil-simple--regular' size={4} classNames={tx('editable.previewIcon', {})} />
    </div>
  );
});

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
          // React 19 lets a callback ref return a cleanup; dropping it would leak whatever the
          // consumer set up.
          // Typed `unknown` because `ForwardedRef`'s callback is declared to return void, while
          // React 19 may hand back a cleanup at runtime.
          const cleanup: unknown = typeof forwardedRef === 'function' ? forwardedRef(element) : undefined;
          if (forwardedRef && typeof forwardedRef !== 'function') {
            forwardedRef.current = element;
          }
          return () => {
            localRef.current = null;
            if (typeof cleanup === 'function') {
              cleanup();
            }
          };
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
export * from './useEditable.ts';

export type { EditableActivation, EditableBlurBehavior, EditableInputProps, EditablePreviewProps, EditableRootProps };
