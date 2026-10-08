//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Editable as EditablePrimitive, useEditableContext } from '@ark-ui/react/editable';
import React, { type ComponentPropsWithRef, type PropsWithChildren, forwardRef, useEffect, useRef } from 'react';

import { createContext } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import * as Icon from '../Icon/Icon.tsx';
import { type EditableActivationBinding, type UseEditableOptions, useEditable } from './useEditable.ts';

const EDITABLE_NAME = 'Editable.Root';
const EDITABLE_PREVIEW_NAME = 'Editable.Preview';
const EDITABLE_INPUT_NAME = 'Editable.Input';

// The keyboard door onto the preview depends on the activation gesture, which the root is given and the machine the
// parts read does not expose.
const [EditableActivationProvider, useEditableActivation] = createContext<EditableActivationBinding>(EDITABLE_NAME);

//
// Root
//

type EditableRootProps = ThemedClassName<
  PropsWithChildren<UseEditableOptions & Omit<ComponentPropsWithRef<'div'>, keyof UseEditableOptions | 'children'>>
>;

/** Seeds the machine (through `useEditable`) and lays Preview and Input into one grid cell, so the swap moves nothing. */
const EditableRoot = forwardRef<HTMLDivElement, EditableRootProps>(
  (
    {
      children,
      classNames,
      value,
      defaultValue,
      onValueChange,
      activation,
      blurBehavior,
      disabled,
      placeholder,
      editing,
      onEditingChange,
      ...props
    },
    forwardedRef,
  ) => {
    const { api, activationProps } = useEditable({
      value,
      defaultValue,
      onValueChange,
      activation,
      blurBehavior,
      disabled,
      placeholder,
      editing,
      onEditingChange,
    });

    return (
      <EditablePrimitive.RootProvider
        {...props}
        value={api}
        className={mx(recipes.editable(), classNames)}
        ref={forwardedRef}
      >
        <EditableActivationProvider {...activationProps}>{children}</EditableActivationProvider>
      </EditablePrimitive.RootProvider>
    );
  },
);

EditableRoot.displayName = EDITABLE_NAME;

//
// Preview
//

type EditablePreviewProps = ThemedClassName<Omit<ComponentPropsWithRef<'span'>, 'children'>>;

/** The static text and the activation affordance; hidden by the machine while editing. */
const EditablePreview = forwardRef<HTMLSpanElement, EditablePreviewProps>(({ classNames, ...props }, forwardedRef) => {
  const { valueText, edit } = useEditableContext();
  const { role, onKeyDown } = useEditableActivation(EDITABLE_PREVIEW_NAME);

  return (
    <EditablePrimitive.Preview
      // Ahead of the spread so a caller can still name it: the machine names it "edit", what the gesture does rather
      // than what the field holds, which in a list of rows is every row's name.
      aria-label={undefined}
      // The machine opens on a pointer gesture only; without this the preview is a tab stop that answers nothing.
      role={role}
      onKeyDown={onKeyDown}
      {...props}
      className={mx(recipes.editablePreview(), classNames)}
      ref={forwardedRef}
    >
      <span className={recipes.editablePreviewText()}>{valueText}</span>
      {/* The pencil is a door of its own: one click opens the field whatever gesture the preview takes (a double-click
          in a list, where a single click selects the row). */}
      <Icon.Icon
        icon='ph--pencil-simple--regular'
        classNames={recipes.editablePreviewIcon()}
        data-testid='editable.edit'
        // A disabled field hides the pencil (`editable.css`), so it takes no click.
        onClick={(event) => {
          event.stopPropagation();
          edit();
        }}
      />
    </EditablePrimitive.Preview>
  );
});

EditablePreview.displayName = EDITABLE_PREVIEW_NAME;

//
// Input
//

type EditableInputProps = ThemedClassName<Omit<ComponentPropsWithRef<'input'>, 'value' | 'onChange' | 'placeholder'>>;

/** The field shown while editing, focused with the caret at the end, with a save button at its end. */
const EditableInput = forwardRef<HTMLInputElement, EditableInputProps>(({ classNames, ...props }, forwardedRef) => {
  const { editing } = useEditableContext();
  const localRef = useRef<HTMLInputElement | null>(null);

  // The machine focuses the input but leaves the caret where the browser puts it, which from the keyboard is the start.
  useEffect(() => {
    const element = localRef.current;
    if (editing && element) {
      element.focus();
      const end = element.value.length;
      element.setSelectionRange(end, end);
    }
  }, [editing]);

  return (
    <>
      <EditablePrimitive.Input
        {...props}
        className={mx(recipes.editableInput(), classNames)}
        ref={(element) => {
          localRef.current = element;
          // Typed `unknown`: `ForwardedRef`'s callback is declared void, but React 19 may return a cleanup.
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
      {/* Saves the edit, at the input's end in the same cell; the machine hides it while not editing. */}
      <EditablePrimitive.SubmitTrigger
        className={recipes.editableSubmit()}
        aria-label='Save'
        data-testid='editable.save'
      >
        <Icon.Icon icon='ph--check--bold' />
      </EditablePrimitive.SubmitTrigger>
    </>
  );
});

EditableInput.displayName = EDITABLE_INPUT_NAME;

export { EditableInput as Input, EditablePreview as Preview, EditableRoot as Root };
export type { EditableInputProps as InputProps, EditablePreviewProps as PreviewProps, EditableRootProps as RootProps };
export * from './useEditable.ts';
