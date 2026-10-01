//
// Copyright 2026 DXOS.org
//

import { Field as FieldPrimitive, useFieldContext } from '@ark-ui/react/field';
import { useFieldsetContext } from '@ark-ui/react/fieldset';
import React, { Children, type ComponentPropsWithoutRef, forwardRef, isValidElement } from 'react';

import { mx } from '@dxos/ui-theme';
import { type MessageValence, type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { type Level, type Span, spanAttributes } from '../Container/index.ts';

//
// Root
//

/** The current Field's validation tones; `error` is the one that makes the field invalid. */
type FieldValence = MessageValence;

type FieldRootProps = ThemedClassName<FieldPrimitive.RootProps> & {
  /**
   * Tones the control's border and focus ring and the HelperText; `error` also sets `invalid` (unless given), so
   * ErrorText shows and the control reports `aria-invalid`.
   */
  validationValence?: FieldValence;
  /**
   * `stack` (default) puts the label above the control (decision 13). `row` joins the parent's `columns` as a subgrid
   * row (Phase 4 decision 3): the Header and HelperText take the tracks before the parent's interior `control` line,
   * every other child the tracks after it; below the pane's collapse width the row stacks.
   */
  layout?: 'stack' | 'row';
  /** A surface rung for a `row` field, which then draws a separator border around itself (a settings card row). */
  level?: Level;
  /** Tracks the field spans in its parent Container (e.g. two columns of a multi-column form). */
  span?: Span;
};

/** A part, not a container (decision 13): a flex stack in the content track with the label above its control. */
const FieldRoot = forwardRef<HTMLDivElement, FieldRootProps>(
  ({ classNames, invalid, validationValence, layout, level, span, style, ...props }, forwardedRef) => {
    // Ark inherits only `disabled` from an enclosing Fieldset; an invalid set marks its fields invalid too.
    const fieldset = useFieldsetContext();
    const { style: spanStyle, ...spanAttrs } = spanAttributes(span);
    return (
      <FieldPrimitive.Root
        {...props}
        {...spanAttrs}
        style={{ ...spanStyle, ...style }}
        invalid={invalid ?? (validationValence === 'error' || fieldset?.invalid)}
        data-valence={validationValence === 'neutral' ? undefined : validationValence}
        data-layout={layout === 'row' ? layout : undefined}
        data-surface={layout === 'row' ? level : undefined}
        className={mx(recipes.field(), classNames)}
        ref={forwardedRef}
      />
    );
  },
);

FieldRoot.displayName = 'Next.Field.Root';

//
// Header
//

type FieldHeaderProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  /** Overrides the field's size; by default the row shares it, so its actions share the control's end column. */
  size?: Size;
};

/** The label row: a Label followed by optional trailing Icons or icon-only Buttons, aligned to the control's edges. */
const FieldHeader = forwardRef<HTMLDivElement, FieldHeaderProps>(({ classNames, size, ...props }, forwardedRef) => (
  <div
    {...props}
    data-scope='field'
    data-part='header'
    data-size={size}
    className={mx(recipes.fieldHeader(), classNames)}
    ref={forwardedRef}
  />
));

FieldHeader.displayName = 'Next.Field.Header';

//
// Label
//

type FieldLabelProps = ThemedClassName<FieldPrimitive.LabelProps> & {
  /** Visually hidden but still names the control, like `Next.Label srOnly`. */
  srOnly?: boolean;
};

/**
 * Marks the part a label click focuses in a control whose labelled element is a hidden input (DateInput's first
 * segment, PinInput's first cell), since the browser cannot focus the hidden input the label points at.
 */
const LABEL_TARGET_ATTRIBUTE = 'data-label-target';

/**
 * Names the control; while the root is `required` it ends with the required indicator, unless a
 * `RequiredIndicator` among its children places the mark itself.
 */
const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ classNames, srOnly, onClick, children, ...props }, forwardedRef) => {
    const field = useFieldContext();
    const placed = Children.toArray(children).some(
      (child) => isValidElement(child) && child.type === FieldRequiredIndicator,
    );
    return (
      <FieldPrimitive.Label
        {...props}
        onClick={(event) => {
          onClick?.(event);
          const control = field && event.currentTarget.ownerDocument.getElementById(field.ids.control);
          const target = control?.parentElement?.querySelector<HTMLElement>(`[${LABEL_TARGET_ATTRIBUTE}]`);
          if (!event.defaultPrevented && target) {
            event.preventDefault();
            target.focus();
          }
        }}
        data-sr-only={srOnly ? '' : undefined}
        className={mx(recipes.label(), classNames)}
        ref={forwardedRef}
      >
        {children}
        {field?.required && !placed && <FieldRequiredIndicator />}
      </FieldPrimitive.Label>
    );
  },
);

FieldLabel.displayName = 'Next.Field.Label';

//
// RequiredIndicator
//

type FieldRequiredIndicatorProps = ThemedClassName<FieldPrimitive.RequiredIndicatorProps>;

/** Ark's mark for a `required` root (`*` by default); `Field.Label` renders one, so use this only to place it yourself. */
const FieldRequiredIndicator = forwardRef<HTMLSpanElement, FieldRequiredIndicatorProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <FieldPrimitive.RequiredIndicator
      aria-hidden
      {...props}
      className={mx(recipes.fieldRequired(), classNames)}
      ref={forwardedRef}
    />
  ),
);

FieldRequiredIndicator.displayName = 'Next.Field.RequiredIndicator';

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
  RequiredIndicator: FieldRequiredIndicator,
  HelperText: FieldHelperText,
  ErrorText: FieldErrorText,
};

export { LABEL_TARGET_ATTRIBUTE };

export type {
  FieldErrorTextProps,
  FieldHeaderProps,
  FieldHelperTextProps,
  FieldLabelProps,
  FieldRequiredIndicatorProps,
  FieldRootProps,
  FieldValence,
};
