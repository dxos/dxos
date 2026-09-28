//
// Copyright 2026 DXOS.org
//

import { Field as FieldPrimitive } from '@ark-ui/react/field';
import { useFieldsetContext } from '@ark-ui/react/fieldset';
import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';

//
// Root
//

type FieldRootProps = ThemedClassName<FieldPrimitive.RootProps>;

/** A part, not a container (decision 13): a flex stack in the content track with the label above its control. */
const FieldRoot = forwardRef<HTMLDivElement, FieldRootProps>(({ classNames, invalid, ...props }, forwardedRef) => {
  // Ark inherits only `disabled` from an enclosing FieldSet; an invalid set marks its fields invalid too.
  const fieldset = useFieldsetContext();
  return (
    <FieldPrimitive.Root
      {...props}
      invalid={invalid ?? fieldset?.invalid}
      className={mx(recipes.field(), classNames)}
      ref={forwardedRef}
    />
  );
});

FieldRoot.displayName = 'Next.Field.Root';

//
// Header
//

type FieldHeaderProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  /** The row's own size; `sm` by default so it reads as a caption row above an `md` control. */
  size?: Size;
};

/** The label row: a Label followed by optional trailing Icons or icon-only Buttons, aligned to the control's edges. */
const FieldHeader = forwardRef<HTMLDivElement, FieldHeaderProps>(
  ({ classNames, size = 'sm', ...props }, forwardedRef) => (
    <div
      {...props}
      data-scope='field'
      data-part='header'
      data-size={size}
      className={mx(recipes.fieldHeader(), classNames)}
      ref={forwardedRef}
    />
  ),
);

FieldHeader.displayName = 'Next.Field.Header';

//
// Label
//

type FieldLabelProps = ThemedClassName<FieldPrimitive.LabelProps>;

const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(({ classNames, ...props }, forwardedRef) => (
  <FieldPrimitive.Label {...props} className={mx(recipes.label(), classNames)} ref={forwardedRef} />
));

FieldLabel.displayName = 'Next.Field.Label';

//
// HelperText
//

type FieldHelperTextProps = ThemedClassName<FieldPrimitive.HelperTextProps>;

const FieldHelperText = forwardRef<HTMLSpanElement, FieldHelperTextProps>(({ classNames, ...props }, forwardedRef) => (
  <FieldPrimitive.HelperText {...props} className={mx(recipes.fieldHelper(), classNames)} ref={forwardedRef} />
));

FieldHelperText.displayName = 'Next.Field.HelperText';

//
// ErrorText
//

type FieldErrorTextProps = ThemedClassName<FieldPrimitive.ErrorTextProps>;

/** Rendered only while the root is `invalid`. */
const FieldErrorText = forwardRef<HTMLSpanElement, FieldErrorTextProps>(({ classNames, ...props }, forwardedRef) => (
  <FieldPrimitive.ErrorText {...props} className={mx(recipes.fieldError(), classNames)} ref={forwardedRef} />
));

FieldErrorText.displayName = 'Next.Field.ErrorText';

export const Field = {
  Root: FieldRoot,
  Header: FieldHeader,
  Label: FieldLabel,
  HelperText: FieldHelperText,
  ErrorText: FieldErrorText,
};

export type { FieldErrorTextProps, FieldHeaderProps, FieldHelperTextProps, FieldLabelProps, FieldRootProps };
