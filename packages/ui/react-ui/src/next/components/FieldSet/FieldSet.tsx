//
// Copyright 2026 DXOS.org
//

import { Fieldset as FieldsetPrimitive } from '@ark-ui/react/fieldset';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';

//
// Root
//

type FieldSetRootProps = ThemedClassName<FieldsetPrimitive.RootProps>;

/** A `<fieldset>` stacking its Fields with the container gap; `disabled` and `invalid` reach every child Field. */
const FieldSetRoot = forwardRef<HTMLFieldSetElement, FieldSetRootProps>(({ classNames, ...props }, forwardedRef) => (
  <FieldsetPrimitive.Root {...props} className={mx(recipes.fieldsetRoot(), classNames)} ref={forwardedRef} />
));

FieldSetRoot.displayName = 'Next.FieldSet.Root';

//
// Legend
//

type FieldSetLegendProps = ThemedClassName<FieldsetPrimitive.LegendProps> & {
  /** The row's own size; `sm` by default so it reads like a Field's label row. */
  size?: Size;
};

/** The set's label row, like `Field.Header`: legend text followed by optional trailing Blocks or icon-only Buttons. */
const FieldSetLegend = forwardRef<HTMLLegendElement, FieldSetLegendProps>(
  ({ classNames, size = 'sm', ...props }, forwardedRef) => (
    <FieldsetPrimitive.Legend
      {...props}
      data-size={size}
      className={mx(recipes.fieldsetLegend(), classNames)}
      ref={forwardedRef}
    />
  ),
);

FieldSetLegend.displayName = 'Next.FieldSet.Legend';

//
// HelperText
//

type FieldSetHelperTextProps = ThemedClassName<FieldsetPrimitive.HelperTextProps>;

const FieldSetHelperText = forwardRef<HTMLSpanElement, FieldSetHelperTextProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <FieldsetPrimitive.HelperText {...props} className={mx(recipes.fieldHelper(), classNames)} ref={forwardedRef} />
  ),
);

FieldSetHelperText.displayName = 'Next.FieldSet.HelperText';

//
// ErrorText
//

type FieldSetErrorTextProps = ThemedClassName<FieldsetPrimitive.ErrorTextProps>;

/** Rendered only while the root is `invalid`. */
const FieldSetErrorText = forwardRef<HTMLSpanElement, FieldSetErrorTextProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <FieldsetPrimitive.ErrorText {...props} className={mx(recipes.fieldError(), classNames)} ref={forwardedRef} />
  ),
);

FieldSetErrorText.displayName = 'Next.FieldSet.ErrorText';

export const FieldSet = {
  Root: FieldSetRoot,
  Legend: FieldSetLegend,
  HelperText: FieldSetHelperText,
  ErrorText: FieldSetErrorText,
};

export type { FieldSetErrorTextProps, FieldSetHelperTextProps, FieldSetLegendProps, FieldSetRootProps };
