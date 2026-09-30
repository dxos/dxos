//
// Copyright 2026 DXOS.org
//

import { Fieldset as FieldsetPrimitive } from '@ark-ui/react/fieldset';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { type Level, containerAttributes } from '../Container/index.ts';

//
// Root
//

type FieldsetRootProps = ThemedClassName<FieldsetPrimitive.RootProps> & {
  /**
   * `inherit` makes the set a subgrid of the enclosing Container, as an inheriting Container is, so nested sets keep
   * the parent's rails and tracks at any depth; without it the set is a flex stack of its own.
   */
  gutter?: 'inherit';
  /** A rung for the set's surface, as on Container; only applies with `gutter='inherit'`. */
  level?: Level;
};

/** A `<fieldset>` stacking its Fields with the container gap; `disabled` and `invalid` reach every child Field. */
const FieldsetRoot = forwardRef<HTMLFieldSetElement, FieldsetRootProps>(
  ({ classNames, gutter, level, style, ...props }, forwardedRef) => {
    const { style: gridStyle, ...grid } = gutter ? containerAttributes({ gutter, level }) : { style: undefined };
    return (
      <FieldsetPrimitive.Root
        {...props}
        {...grid}
        style={gridStyle ? { ...gridStyle, ...style } : style}
        className={mx(recipes.fieldsetRoot(), gutter && recipes.container(), classNames)}
        ref={forwardedRef}
      />
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
const FieldsetLegend = forwardRef<HTMLLegendElement, FieldsetLegendProps>(
  ({ classNames, size = 'sm', ...props }, forwardedRef) => (
    <FieldsetPrimitive.Legend
      {...props}
      data-size={size}
      className={mx(recipes.fieldsetLegend(), classNames)}
      ref={forwardedRef}
    />
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

export const Fieldset = {
  Root: FieldsetRoot,
  Legend: FieldsetLegend,
  HelperText: FieldsetHelperText,
  ErrorText: FieldsetErrorText,
};

export type { FieldsetErrorTextProps, FieldsetHelperTextProps, FieldsetLegendProps, FieldsetRootProps };
