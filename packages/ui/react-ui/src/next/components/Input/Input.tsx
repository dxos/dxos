//
// Copyright 2026 DXOS.org
//

import { Field as FieldPrimitive } from '@ark-ui/react/field';
import React, { type InputHTMLAttributes } from 'react';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { useToolbarItem } from '../Toolbar/index.ts';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Text input at control size; inside a `Field.Root` it takes the field's id, label and description wiring. */
export const Input = composable<HTMLInputElement, InputProps>(({ type = 'text', onFocus, ...props }, forwardedRef) => {
  const toolbarItem = useToolbarItem(props.disabled);
  const { className, ...rest } = composableProps(props, { classNames: recipes.input() });
  return (
    <FieldPrimitive.Input
      {...rest}
      {...toolbarItem}
      onFocus={(event) => {
        onFocus?.(event);
        toolbarItem?.onFocus();
      }}
      type={type}
      data-scope='input'
      data-part='root'
      className={className}
      ref={forwardedRef}
    />
  );
});

Input.displayName = 'Next.Input';
