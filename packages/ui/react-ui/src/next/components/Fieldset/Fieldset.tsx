//
// Copyright 2026 DXOS.org
//

import { Fieldset as FieldsetPrimitive, useFieldsetContext } from '@ark-ui/react/fieldset';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { type Span, spanAttributes } from '../Container/index.ts';

//
// Root
//

type FieldsetRootProps = ThemedClassName<FieldsetPrimitive.RootProps> & {
  /** Tracks the set spans in its parent Container. */
  span?: Span;
};

/**
 * A `group` stacking its Fields with the container gap, named by its Legend; `disabled` and `invalid` reach every
 * child control through context. Not a `<fieldset>`, whose anonymous content box cannot take part in a parent's grid.
 */
const FieldsetRoot = forwardRef<HTMLDivElement, FieldsetRootProps>(
  ({ classNames, span, style, disabled, children, ...props }, forwardedRef) => {
    const { style: spanStyle, ...spanAttrs } = spanAttributes(span);
    return (
      <FieldsetPrimitive.Root
        {...props}
        {...spanAttrs}
        disabled={disabled}
        asChild
        style={{ ...spanStyle, ...style }}
        className={mx(recipes.fieldsetRoot(), classNames)}
      >
        <div role='group' aria-disabled={disabled ? true : undefined} ref={forwardedRef}>
          {children}
        </div>
      </FieldsetPrimitive.Root>
    );
  },
);

FieldsetRoot.displayName = 'Next.Fieldset.Root';

//
// Legend
//

type FieldsetLegendProps = ThemedClassName<FieldsetPrimitive.LegendProps> & {
  /** The row's own size; `sm` by default so it reads like a Field's label row. */
  size?: Size;
};

/** The set's label row, like `Field.Header`: legend text followed by optional trailing Blocks or icon-only Buttons. */
const FieldsetLegend = forwardRef<HTMLDivElement, FieldsetLegendProps>(
  ({ classNames, size = 'sm', children, ...props }, forwardedRef) => (
    <FieldsetPrimitive.Legend {...props} asChild data-size={size} className={mx(recipes.fieldsetLegend(), classNames)}>
      <div ref={forwardedRef}>{children}</div>
    </FieldsetPrimitive.Legend>
  ),
);

FieldsetLegend.displayName = 'Next.Fieldset.Legend';

//
// HelperText
//

type FieldsetHelperTextProps = ThemedClassName<FieldsetPrimitive.HelperTextProps>;

const FieldsetHelperText = forwardRef<HTMLSpanElement, FieldsetHelperTextProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <FieldsetPrimitive.HelperText {...props} className={mx(recipes.fieldHelper(), classNames)} ref={forwardedRef} />
  ),
);

FieldsetHelperText.displayName = 'Next.Fieldset.HelperText';

//
// ErrorText
//

type FieldsetErrorTextProps = ThemedClassName<FieldsetPrimitive.ErrorTextProps>;

/** Rendered only while the root is `invalid`. */
const FieldsetErrorText = forwardRef<HTMLSpanElement, FieldsetErrorTextProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <FieldsetPrimitive.ErrorText {...props} className={mx(recipes.fieldError(), classNames)} ref={forwardedRef} />
  ),
);

FieldsetErrorText.displayName = 'Next.Fieldset.ErrorText';

/**
 * A control's `disabled`, or else its enclosing Fieldset's: the set is a `div`, so the browser no longer disables its
 * controls.
 */
export const useFieldsetDisabled = (disabled?: boolean): boolean | undefined => {
  const fieldset = useFieldsetContext();
  return disabled ?? (fieldset?.disabled || undefined);
};

export const Fieldset = {
  Root: FieldsetRoot,
  Legend: FieldsetLegend,
  HelperText: FieldsetHelperText,
  ErrorText: FieldsetErrorText,
};

export type { FieldsetErrorTextProps, FieldsetHelperTextProps, FieldsetLegendProps, FieldsetRootProps };
