//
// Copyright 2026 DXOS.org
//

import { useFieldContext } from '@ark-ui/react/field';
import { PinInput as PinInputPrimitive } from '@ark-ui/react/pin-input';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { LABEL_TARGET_ATTRIBUTE } from '../Field/index.ts';

export type PinInputProps = ThemedClassName<
  Pick<
    PinInputPrimitive.RootProps,
    | 'mask'
    | 'otp'
    | 'type'
    | 'pattern'
    | 'placeholder'
    | 'blurOnComplete'
    | 'selectOnFocus'
    | 'autoFocus'
    | 'disabled'
    | 'readOnly'
    | 'required'
    | 'invalid'
    | 'name'
    | 'form'
  >
> & {
  /** Number of cells (6 by default, as the current PinInput). */
  'length'?: number;
  /** The code as one string; unfilled cells are absent from its end. */
  'value'?: string;
  'defaultValue'?: string;
  'onValueChange'?: (value: string) => void;
  /** Called once every cell is filled. */
  'onValueComplete'?: (value: string) => void;
  /** Names the cells' group when there is no enclosing `Field.Label`. */
  'aria-label'?: string;
  'data-testid'?: string;
};

const toCells = (value: string | undefined, length: number) =>
  value === undefined ? undefined : Array.from({ length }, (_, index) => value[index] ?? '');

/**
 * Ark pin input: one control-sized square per character, moving focus as each fills, with paste, Backspace and arrow
 * keys from zag. `otp` asks for the one-time-code autofill and `mask` hides the characters. Inside a `Field.Root` the
 * field's label names the cells' group and its description, invalid and disabled state reach every cell. `data-testid`
 * and the ref go to that group.
 */
export const PinInput = forwardRef<HTMLDivElement, PinInputProps>(
  (
    {
      classNames,
      length = 6,
      value,
      defaultValue,
      onValueChange,
      onValueComplete,
      placeholder = '',
      'aria-label': ariaLabel,
      'data-testid': testId,
      ...props
    },
    forwardedRef,
  ) => {
    const field = useFieldContext();
    return (
      <PinInputPrimitive.Root
        {...props}
        count={length}
        value={toCells(value, length)}
        defaultValue={toCells(defaultValue, length)}
        onValueChange={onValueChange && (({ valueAsString }) => onValueChange(valueAsString))}
        onValueComplete={onValueComplete && (({ valueAsString }) => onValueComplete(valueAsString))}
        placeholder={placeholder}
        className={recipes.pinInput()}
      >
        <PinInputPrimitive.Control
          // The cells are one entry, so the group carries the field's name and description.
          role='group'
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : field?.ids.label}
          aria-describedby={field?.ariaDescribedby}
          data-testid={testId}
          className={mx(recipes.pinInputControl(), classNames)}
          ref={forwardedRef}
        >
          {Array.from({ length }, (_, index) => (
            <PinInputPrimitive.Input
              key={index}
              index={index}
              {...(index === 0 && { [LABEL_TARGET_ATTRIBUTE]: '' })}
              className={recipes.pinInputCell()}
            />
          ))}
        </PinInputPrimitive.Control>
        <PinInputPrimitive.HiddenInput />
      </PinInputPrimitive.Root>
    );
  },
);

PinInput.displayName = 'PinInput';
