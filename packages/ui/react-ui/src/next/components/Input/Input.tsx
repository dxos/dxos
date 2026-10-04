//
// Copyright 2026 DXOS.org
//

import { Field as FieldPrimitive } from '@ark-ui/react/field';
import React, { type InputHTMLAttributes, type ReactNode, useRef } from 'react';

import { useComposedRefs } from '@dxos/react-hooks';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { ControlFrame, type ControlFrameVariant } from '../ControlFrame/index.ts';
import { useFieldsetDisabled } from '../Fieldset/index.ts';
import { SystemButton } from '../SystemButton/index.ts';
import { useToolbarItem } from '../Toolbar/index.ts';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  'data-testid'?: string;
  /** `subdued` drops the well, for an input on a surface that already reads as editable; `mono` is for keys and ids. */
  'variant'?: ControlFrameVariant;
  /** Ask password managers not to offer autofill (`data-1p-ignore`), e.g. for a search box. */
  'noAutoFill'?: boolean;
  /** Leading content inside the control row (an Icon, or short text such as a currency). */
  'start'?: ReactNode;
  /** Trailing content inside the control row (an Icon, a unit, or an icon-only Button). */
  'end'?: ReactNode;
  /** Trails the input with a copy button for its current value (e.g. a read-only id); replaces `end`. */
  'copyable'?: boolean;
};

/**
 * Text input at control size; inside a `Field.Root` it takes the field's id, label and description wiring. With
 * `start` or `end` it renders a `ControlFrame` holding the adornments and a bare input; `data-testid` and classes then
 * go to the frame, the ref to the input.
 */
export const Input = composable<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      variant = 'default',
      noAutoFill,
      start,
      end: endProp,
      copyable,
      disabled,
      onFocus,
      'data-testid': testId,
      ...props
    },
    forwardedRef,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const ref = useComposedRefs(forwardedRef, inputRef);
    // Reads the element rather than `value`, so an uncontrolled input copies what it shows.
    const end = copyable ? (
      <SystemButton.Clipboard iconOnly variant='ghost' onCopy={() => inputRef.current?.value ?? ''} />
    ) : (
      endProp
    );
    const fieldsetDisabled = useFieldsetDisabled(disabled);
    const toolbarItem = useToolbarItem(fieldsetDisabled);
    const adorned = start != null || end != null;
    const { className, style, ...rest } = composableProps<HTMLInputElement>(props, {
      classNames: adorned ? undefined : recipes.input(),
    });
    const input = (
      <FieldPrimitive.Input
        {...rest}
        style={adorned ? undefined : style}
        disabled={fieldsetDisabled}
        data-testid={adorned ? undefined : testId}
        {...toolbarItem}
        onFocus={(event) => {
          onFocus?.(event);
          toolbarItem?.onFocus();
        }}
        type={type}
        data-1p-ignore={noAutoFill ? '' : undefined}
        data-scope='input'
        data-part={adorned ? 'input' : 'root'}
        data-variant={adorned ? undefined : variant}
        className={adorned ? recipes.inputField() : className}
        ref={ref}
      />
    );
    if (!adorned) {
      return input;
    }

    return (
      <ControlFrame
        scope='input'
        start={start}
        end={end}
        variant={variant}
        data-testid={testId}
        classNames={className}
        style={style}
      >
        {input}
      </ControlFrame>
    );
  },
);

Input.displayName = 'Input';
