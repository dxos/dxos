//
// Copyright 2026 DXOS.org
//

// `Editable` — text that becomes an input in place ("inline edit" / "click-to-edit"), built on
// `@ark-ui/react`'s Editable (zag state machine).
//
//   <Editable.Root value={title} onValueChange={setTitle} placeholder='Untitled'>
//     <Editable.Preview />
//     <Editable.Input />
//   </Editable.Root>
//
// - `Root` — headless; owns the value (controlled or uncontrolled) and whether it is editing.
// - `Preview` — the static text, and the activation affordance.
// - `Input` — the field shown while editing; autofocuses and puts the caret at the end.
//
// The two render into ONE grid cell so the box never changes size between them, and they share
// their metrics through the theme (see `Editable.theme.ts`). A row containing one of these must not
// move when the reader clicks it. The machine hides the part that is not in play rather than
// unmounting it, so neither ever claims a row of its own.

import { Editable as EditablePrimitive, useEditableContext } from '@ark-ui/react/editable';
import { createContext } from '@radix-ui/react-context';
import React, { type ComponentPropsWithRef, type PropsWithChildren, forwardRef, useEffect, useRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon } from '../Icon';
import { type EditableActivationBinding, type UseEditableOptions, useEditable } from './useEditable';

const EDITABLE_NAME = 'Editable.Root';
const EDITABLE_PREVIEW_NAME = 'Editable.Preview';
const EDITABLE_INPUT_NAME = 'Editable.Input';

// The keyboard door onto the preview. It depends on the activation gesture, which the root is given
// and the machine the parts read does not expose.
const [EditableActivationProvider, useEditableActivation] = createContext<EditableActivationBinding>(EDITABLE_NAME);

//
// Root — seeds the machine and renders the grid the two parts share.
//

type EditableRootProps = ThemedClassName<PropsWithChildren<UseEditableOptions>>;

const EditableRoot = forwardRef<HTMLDivElement, EditableRootProps>(
  ({ children, classNames, ...options }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { api, activationProps } = useEditable(options);

    return (
      <EditablePrimitive.RootProvider value={api} className={tx('editable.root', {}, classNames)} ref={forwardedRef}>
        <EditableActivationProvider {...activationProps}>{children}</EditableActivationProvider>
      </EditablePrimitive.RootProvider>
    );
  },
);

EditableRoot.displayName = EDITABLE_NAME;

//
// Preview — the static text. Hidden by the machine while editing, so the input takes the cell.
//

type EditablePreviewProps = ThemedClassName<Omit<ComponentPropsWithRef<'span'>, 'children'>>;

const EditablePreview = forwardRef<HTMLSpanElement, EditablePreviewProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { valueText } = useEditableContext();
  const { role, onKeyDown } = useEditableActivation(EDITABLE_PREVIEW_NAME);

  return (
    <EditablePrimitive.Preview
      // Ahead of the spread so a caller can still name the preview: the machine names it "edit",
      // which is what the gesture does rather than what the field holds — in a list of rows that is
      // every row with the same name.
      aria-label={undefined}
      // A gesture the machine only takes from a pointer; without this the preview is a tab stop that
      // answers nothing.
      role={role}
      onKeyDown={onKeyDown}
      {...props}
      data-testid='editable.preview'
      className={tx('editable.preview', {}, classNames)}
      ref={forwardedRef}
    >
      <span className='truncate'>{valueText}</span>
      {/* Pushed to the trailing edge: the affordance belongs to the row, not to the text, so it
            does not move as the title's length changes. */}
      <span className='grow' />
      <Icon icon='ph--pencil-simple--regular' size={4} classNames={tx('editable.previewIcon', {})} />
    </EditablePrimitive.Preview>
  );
});

EditablePreview.displayName = EDITABLE_PREVIEW_NAME;

//
// Input — shown while editing; autofocuses and puts the caret at the end.
//

type EditableInputProps = ThemedClassName<Omit<ComponentPropsWithRef<'input'>, 'value' | 'onChange' | 'placeholder'>>;

const EditableInput = forwardRef<HTMLInputElement, EditableInputProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { editing } = useEditableContext();
  const localRef = useRef<HTMLInputElement | null>(null);

  // The machine focuses the input but leaves the caret where the browser puts it, which for a field
  // opened from the keyboard is the start — so the reader types in front of their own title.
  useEffect(() => {
    const element = localRef.current;
    if (editing && element) {
      element.focus();
      const end = element.value.length;
      element.setSelectionRange(end, end);
    }
  }, [editing]);

  return (
    <EditablePrimitive.Input
      {...props}
      data-testid='editable.input'
      className={tx('editable.input', {}, classNames)}
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
});

EditableInput.displayName = EDITABLE_INPUT_NAME;

export const Editable = {
  Root: EditableRoot,
  Preview: EditablePreview,
  Input: EditableInput,
};

export { useEditableContext };
export * from './useEditable';

export type { EditableInputProps, EditablePreviewProps, EditableRootProps };
