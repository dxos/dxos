//
// Copyright 2026 DXOS.org
//

import { Fieldset as FieldsetPrimitive, useFieldsetContext } from '@ark-ui/react/fieldset';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import {
  DefaultGutterProvider,
  type Level,
  type Span,
  containerAttributes,
  spanAttributes,
} from '../Container/index.ts';

//
// Root
//

type FieldsetRootProps = ThemedClassName<FieldsetPrimitive.RootProps> & {
  /** Tracks the set spans in its parent Container. */
  span?: Span;
  /**
   * `inherit` makes the set a subgrid of the enclosing Container, as an inheriting Container is, so nested sets keep
   * the parent's tracks at any depth; without it the set is a flex stack of its own.
   */
  gutter?: 'inherit';
  /** A rung for the set's surface, as on Container; only applies with `gutter='inherit'`. */
  level?: Level;
  /**
   * A nested group (with `gutter='inherit'`): bordered and indented one step inside the parent's content track, on its
   * host's surface, its fields still sharing the parent's columns.
   */
  inset?: boolean;
};

/**
 * A `group` stacking its Fields with the container gap, named by its Legend; `disabled` and `invalid` reach every
 * child control through context. Not a `<fieldset>`, whose anonymous content box cannot take part in a parent's grid;
 * with `gutter='inherit'` it is a subgrid of its parent.
 */
const FieldsetRoot = forwardRef<HTMLDivElement, FieldsetRootProps>(
  ({ classNames, span, gutter, level, inset, style, disabled, children, ...props }, forwardedRef) => {
    const { style: spanStyle, ...spanAttrs } = spanAttributes(span);
    const { style: gridStyle, ...grid } = gutter ? containerAttributes({ gutter, level }) : { style: undefined };
    return (
      <FieldsetPrimitive.Root
        {...props}
        {...spanAttrs}
        {...grid}
        data-inset={gutter && inset ? '' : undefined}
        disabled={disabled}
        asChild
        style={{ ...spanStyle, ...gridStyle, ...style }}
        className={mx(recipes.fieldsetRoot(), gutter && recipes.container(), classNames)}
      >
        <div role='group' aria-disabled={disabled ? true : undefined} ref={forwardedRef}>
          {gutter ? <DefaultGutterProvider gutter={undefined}>{children}</DefaultGutterProvider> : children}
        </div>
      </FieldsetPrimitive.Root>
    );
  },
);

FieldsetRoot.displayName = 'Fieldset.Root';

//
// Legend
//

type FieldsetLegendProps = ThemedClassName<FieldsetPrimitive.LegendProps> & {
  /** A size of its own makes the legend a heading row; by default it takes the set's size, in its label step. */
  size?: Size;
  /** `section` is a top-level section's title: content-coloured, at text-lg. */
  variant?: 'section';
};

/** The set's label row, like `Field.Header`: legend text followed by optional trailing Blocks or icon-only Buttons. */
const FieldsetLegend = forwardRef<HTMLDivElement, FieldsetLegendProps>(
  ({ classNames, size, variant, children, ...props }, forwardedRef) => (
    <FieldsetPrimitive.Legend
      {...props}
      asChild
      data-size={size}
      data-variant={variant}
      className={mx(recipes.fieldsetLegend(), classNames)}
    >
      <div ref={forwardedRef}>{children}</div>
    </FieldsetPrimitive.Legend>
  ),
);

FieldsetLegend.displayName = 'Fieldset.Legend';

//
// HelperText
//

type FieldsetHelperTextProps = ThemedClassName<FieldsetPrimitive.HelperTextProps>;

const FieldsetHelperText = forwardRef<HTMLSpanElement, FieldsetHelperTextProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <FieldsetPrimitive.HelperText {...props} className={mx(recipes.fieldHelper(), classNames)} ref={forwardedRef} />
  ),
);

FieldsetHelperText.displayName = 'Fieldset.HelperText';

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

FieldsetErrorText.displayName = 'Fieldset.ErrorText';

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
