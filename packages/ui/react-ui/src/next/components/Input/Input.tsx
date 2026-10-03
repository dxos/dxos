//
// Copyright 2026 DXOS.org
//

import { Field as FieldPrimitive } from '@ark-ui/react/field';
import React, { type InputHTMLAttributes, type ReactNode } from 'react';

import { composable, composableProps } from '../../../util/slots.ts';
import { recipes } from '../../recipes.ts';
import { useToolbarItem } from '../Toolbar/index.ts';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  'data-testid'?: string;
  /** `subdued` drops the well, for an input on a surface that already reads as editable. */
  'variant'?: 'default' | 'subdued';
  /** Ask password managers not to offer autofill (`data-1p-ignore`), e.g. for a search box. */
  'noAutoFill'?: boolean;
  /** Leading content inside the control row (an Icon, or short text such as a currency). */
  'start'?: ReactNode;
  /** Trailing content inside the control row (an Icon, a unit, or an icon-only Button). */
  'end'?: ReactNode;
};

/**
 * Text input at control size; inside a `Field.Root` it takes the field's id, label and description wiring. With
 * `start` or `end` it renders a control row holding the adornments and a bare input, like DateInput's; `data-testid`
 * and classes then go to the row, the ref to the input.
 */
export const Input = composable<HTMLInputElement, InputProps>(
  (
    { type = 'text', variant = 'default', noAutoFill, start, end, onFocus, 'data-testid': testId, ...props },
    forwardedRef,
  ) => {
    const toolbarItem = useToolbarItem(props.disabled);
    const adorned = start != null || end != null;
    const { className, ...rest } = composableProps<HTMLInputElement>(props, {
      classNames: adorned ? recipes.inputRow() : recipes.input(),
    });
    const input = (
      <FieldPrimitive.Input
        {...rest}
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
        ref={forwardedRef}
      />
    );
    if (!adorned) {
      return input;
    }

    return (
      <span data-scope='input' data-part='root' data-variant={variant} data-testid={testId} className={className}>
        {start != null && (
          <span data-scope='input' data-part='start' className={recipes.inputAdornment()}>
            {start}
          </span>
        )}
        {input}
        {end != null && (
          <span data-scope='input' data-part='end' className={recipes.inputAdornment()}>
            {end}
          </span>
        )}
      </span>
    );
  },
);

Input.displayName = 'Next.Input';
