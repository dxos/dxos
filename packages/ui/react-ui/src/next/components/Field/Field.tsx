//
// Copyright 2026 DXOS.org
//

import { Field as FieldPrimitive } from '@ark-ui/react/field';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';

//
// Root
//

type FieldRootProps = ThemedClassName<FieldPrimitive.RootProps>;

/** A part, not a container (decision 13): a flex stack in the content track with the label above its control. */
const FieldRoot = forwardRef<HTMLDivElement, FieldRootProps>(({ classNames, ...props }, forwardedRef) => (
  <FieldPrimitive.Root {...props} className={mx(recipes.field(), classNames)} ref={forwardedRef} />
));

FieldRoot.displayName = 'Next.Field.Root';

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
  Label: FieldLabel,
  HelperText: FieldHelperText,
  ErrorText: FieldErrorText,
};

export type { FieldErrorTextProps, FieldHelperTextProps, FieldLabelProps, FieldRootProps };
