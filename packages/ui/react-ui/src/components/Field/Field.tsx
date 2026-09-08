//
// Copyright 2023 DXOS.org
//

// `Field` — a labelled control on Ark's field: the field owns the ids and the wiring between a
// label, its control, the helper text and the error text (`htmlFor`, `aria-describedby`,
// `aria-errormessage`, `aria-invalid`, the required/disabled/read-only state on every part). DXOS
// owns the controls and their surfaces, the finer `validationValence` the theme colours by, and the
// picker trigger a date field registers with its root.

import { Checkbox as CheckboxPrimitive, useCheckbox } from '@ark-ui/react/checkbox';
import { ark } from '@ark-ui/react/factory';
import { Field as FieldPrimitive, useFieldContext } from '@ark-ui/react/field';
import React, {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type MouseEvent,
  PropsWithChildren,
  type ReactNode,
  forwardRef,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useComposedRefs, useControllableState } from '@dxos/react-hooks';
import { type Density, type Elevation, type Size } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { IconButton, IconButtonProps } from '../Button';
import { Icon } from '../Icon';
import { FIELD_NAME, type FieldValence, FieldValenceProvider, useFieldValence } from './FieldContext';
import { type FieldTriggerHandler, FieldTriggerProvider, useFieldTriggerContext } from './FieldTriggerContext';
import { PinInput as PinInputPrimitive, type PinInputProps as PinInputPrimitiveProps } from './PinInput';
import {
  SegmentedDate,
  type SegmentedDateProps,
  SegmentedDateTime,
  type SegmentedDateTimeProps,
  SegmentedTime,
  type SegmentedTimeProps,
} from './SegmentedInput';

type InputVariant = 'default' | 'subdued';

type FieldSharedProps = Partial<{ density: Density; elevation: Elevation; variant: InputVariant }>;

//
// Root — the field, with the trigger registry a date field's picker button reaches through.
//

type FieldRootProps = ThemedClassName<
  PropsWithChildren<{
    /** The control's id, which the label points at; generated when absent. */
    id?: string;
    /** The tone of the validation message; `error` is what the field reports as invalid. */
    validationValence?: FieldValence;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    /** Merge the field's root into the single child instead of rendering a box of its own. */
    asChild?: boolean;
  }>
>;

const Root = ({
  children,
  classNames,
  id,
  validationValence = 'neutral',
  required,
  disabled,
  readOnly,
  asChild,
}: FieldRootProps) => {
  const { tx } = useThemeContext();
  const handlerRef = useRef<FieldTriggerHandler | null>(null);
  const [hasTrigger, setHasTrigger] = useState(false);

  const registerTrigger = useCallback((handler: FieldTriggerHandler) => {
    handlerRef.current = handler;
    setHasTrigger(true);
    return () => {
      if (handlerRef.current === handler) {
        handlerRef.current = null;
        setHasTrigger(false);
      }
    };
  }, []);

  const trigger = useCallback(() => {
    handlerRef.current?.();
  }, []);

  return (
    <FieldTriggerProvider registerTrigger={registerTrigger} trigger={trigger} hasTrigger={hasTrigger}>
      <FieldValenceProvider validationValence={validationValence}>
        {/* The field needs an element to watch its texts from; `contents` keeps it out of the layout. */}
        <FieldPrimitive.Root
          id={id}
          invalid={validationValence === 'error'}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          asChild={asChild}
          className={tx('field.root', {}, classNames)}
        >
          {children}
        </FieldPrimitive.Root>
      </FieldValenceProvider>
    </FieldTriggerProvider>
  );
};

Root.displayName = 'Field.Root';

//
// TriggerIcon — sibling button that opens the picker of the registered field. Renders nothing
// when no field in the surrounding `Field.Root` has registered an opener.
//

// `label` and `icon` have defaults below, so both are optional for callers (e.g. `<Field.TriggerIcon />`).
// `onClick` is reserved — the trigger always opens the registered picker.
type TriggerIconProps = Omit<IconButtonProps, 'label' | 'onClick'> & { label?: string };

const TriggerIcon = forwardRef<HTMLButtonElement, TriggerIconProps>(
  ({ classNames, icon = 'ph--calendar--regular', 'aria-label': ariaLabel, label, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const ctx = useFieldTriggerContext('Field.TriggerIcon');
    if (!ctx.hasTrigger) {
      return null;
    }

    return (
      <IconButton
        ref={forwardedRef}
        variant='ghost'
        icon={icon}
        iconOnly
        classNames={classNames}
        aria-label={ariaLabel}
        label={label ?? ariaLabel ?? t('trigger-button.label')}
        {...props}
        onClick={ctx.trigger}
      />
    );
  },
);

TriggerIcon.displayName = 'Field.TriggerIcon';

//
// Label
//

type LabelProps = ThemedClassName<ComponentPropsWithRef<typeof FieldPrimitive.Label>> & { srOnly?: boolean };

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ classNames, children, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <FieldPrimitive.Label {...props} className={tx('field.label', { srOnly }, classNames)} ref={forwardedRef}>
      {children}
    </FieldPrimitive.Label>
  );
});

Label.displayName = 'Field.Label';

//
// Description
//

type HelperTextProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof ark.span>, 'id'>> & { srOnly?: boolean };

/** What describes the control: the field points `aria-describedby` at it. */
const HelperText = forwardRef<HTMLSpanElement, HelperTextProps>(
  ({ classNames, children, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <FieldPrimitive.HelperText
        {...props}
        className={tx('field.helperText', { srOnly }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </FieldPrimitive.HelperText>
    );
  },
);

HelperText.displayName = 'Field.HelperText';

//
// ErrorText
//

type ErrorTextProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof ark.span>, 'id'>> & { srOnly?: boolean };

/**
 * The validation message, coloured by the valence. An error is the field's error text — the control
 * names it through `aria-errormessage` and it announces itself — while any other tone is plain text.
 */
const ErrorText = forwardRef<HTMLSpanElement, ErrorTextProps>(
  ({ classNames, children, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { validationValence } = useFieldValence(FIELD_NAME);
    const Comp = validationValence === 'error' ? FieldPrimitive.ErrorText : ark.span;
    return (
      <Comp {...props} className={tx('field.errorText', { srOnly, validationValence }, classNames)} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

ErrorText.displayName = 'Field.ErrorText';

//
// PinInput
//

type PinInputProps = ThemedClassName<FieldSharedProps & Omit<PinInputPrimitiveProps, 'className' | 'segmentClassName'>>;

const PinInput = forwardRef<HTMLInputElement, PinInputProps>(
  ({ classNames, density: propsDensity, elevation: propsElevation, ...props }, forwardedRef) => {
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);

    return (
      <PinInputPrimitive
        {...{
          ...props,
          ...(props.autoFocus && !hasIosKeyboard && { autoFocus: true }),
        }}
        className={tx('field.pin', { disabled: props.disabled }, classNames) || ''}
        segmentClassName={tx('field.segment', { disabled: props.disabled, density, elevation }) || ''}
        ref={forwardedRef}
      />
    );
  },
);

PinInput.displayName = 'Field.PinInput';

//
// Input
//

type AutoFillProps = {
  noAutoFill?: boolean;
};

type AdornmentProps = {
  /** Content rendered inside the input container before the field (icon or text). */
  start?: ReactNode;
  /** Content rendered inside the input container after the field (icon, text, or button). */
  end?: ReactNode;
};

type InputProps = FieldSharedProps &
  ThemedClassName<Omit<ComponentPropsWithRef<typeof FieldPrimitive.Input>, 'id'>> &
  AutoFillProps &
  AdornmentProps;

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { classNames, density: densityProp, elevation: elevationProp, variant, noAutoFill, start, end, ...props },
    forwardedRef,
  ) => {
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(densityProp);
    const elevation = useElevationContext(elevationProp);
    const { validationValence } = useFieldValence(FIELD_NAME);
    const adorned = start != null || end != null;

    const field = (
      <FieldPrimitive.Input
        {...props}
        // TODO(wittjosiah): Factor out autofill properies.
        {...{ 'data-1p-ignore': noAutoFill }}
        // Sizing comes from the `--dx-control*` knobs; `data-density` is what applies a per-control
        // override of them (see theme/spacing.css), so a `density` prop still works standalone.
        data-density={density}
        className={tx(
          'field.input',
          {
            // When adorned the surrounding container owns the surface/border/focus, so the field is
            // rendered "bare" (subdued) regardless of the requested variant.
            variant: adorned ? 'subdued' : variant,
            disabled: props.disabled,
            density,
            elevation,
            validationValence,
          },
          adorned ? undefined : classNames,
        )}
        {...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })}
        ref={forwardedRef}
      />
    );

    if (!adorned) {
      return field;
    }

    return (
      <div
        data-density={density}
        className={tx('field.container', { variant, disabled: props.disabled, density, validationValence }, classNames)}
      >
        {start != null && <span className={tx('field.adornment', { side: 'start' })}>{start}</span>}
        {field}
        {end != null && <span className={tx('field.adornment', { side: 'end' })}>{end}</span>}
      </div>
    );
  },
);

Input.displayName = 'Field.Input';

//
// Textarea
//

type TextareaProps = FieldSharedProps &
  ThemedClassName<Omit<ComponentPropsWithRef<typeof FieldPrimitive.Textarea>, 'id'>>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ classNames, density: propsDensity, elevation: propsElevation, variant, ...props }, forwardedRef) => {
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);
    const { validationValence } = useFieldValence(FIELD_NAME);

    return (
      <FieldPrimitive.Textarea
        {...props}
        data-density={density}
        className={tx(
          'field.textarea',
          {
            variant,
            disabled: props.disabled,
            density,
            elevation,
            validationValence,
          },
          classNames,
        )}
        {...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })}
        ref={forwardedRef}
      />
    );
  },
);

Textarea.displayName = 'Field.Textarea';

//
// Checkbox
//

type CheckedState = boolean | 'indeterminate';

/** Element props reach the visible control (a div); the form fields reach the hidden input. */
type CheckboxProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'defaultChecked' | 'defaultValue'>> & {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  // A method signature, so a handler typed for the boolean it will get still fits.
  onCheckedChange?(checked: CheckedState): void;
  size?: Size;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  name?: string;
  form?: string;
  /** Submitted with the form (default `on`). */
  value?: string;
  /** The control's own label, laid out beside it; without one the root is box-less and a `Field.Label` names the control. */
  children?: ReactNode;
};

/**
 * A native checkbox, visually hidden, behind a styled control. The `Field.Root` id lands on the
 * input so `Field.Label` reaches it; everything else (test ids, handlers) lands on the visible
 * control, which is what a pointer or a test hits. This is the standard form of Ark's checkbox
 * anatomy: with `children` the root is Ark's `<label>` around control and text, so a labelled
 * checkbox is one element rather than a row built at the call site.
 */
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      classNames,
      checked,
      defaultChecked,
      onCheckedChange,
      size,
      disabled,
      required,
      readOnly,
      name,
      form,
      value,
      onClick,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    // The field owns the id and the described-by/error wiring; the valence is ours.
    const field = useFieldContext();
    const { validationValence } = useFieldValence(FIELD_NAME);
    const { tx } = useThemeContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const checkbox = useCheckbox({
      ids: { hiddenInput: field?.ids.control },
      checked,
      defaultChecked,
      onCheckedChange: onCheckedChange && (({ checked }) => onCheckedChange(checked)),
      disabled: disabled ?? field?.disabled,
      required: required ?? field?.required,
      readOnly: readOnly ?? field?.readOnly,
      invalid: validationValence === 'error',
      name,
      form,
      value,
    });

    // The machine toggles through the label's activation of the input, which any ancestor that
    // calls `preventDefault()` on the click (a tree row does) cancels. Clicking the input here and
    // cancelling the activation keeps exactly one toggle per click, on the same path the keyboard
    // takes, wherever the control sits.
    const handleClick = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        event.preventDefault();
        if (!checkbox.disabled && !readOnly) {
          inputRef.current?.click();
          inputRef.current?.focus();
        }
      },
      [onClick, checkbox.disabled, readOnly],
    );

    return (
      <CheckboxPrimitive.RootProvider
        value={checkbox}
        className={children ? tx('field.checkboxRoot', { disabled: checkbox.disabled }) : 'contents'}
      >
        <CheckboxPrimitive.Control
          {...props}
          // Focusable by pointer only, so a press lands focus here (as it did on the button this
          // replaces) instead of on the nearest focusable ancestor, which a tree row re-renders on.
          tabIndex={-1}
          onClick={handleClick}
          className={tx('field.checkbox', { size }, 'shrink-0', classNames)}
        >
          <CheckboxPrimitive.Indicator asChild>
            <Icon icon='ph--check--regular' classNames={tx('field.checkboxIndicator', { size })} />
          </CheckboxPrimitive.Indicator>
          <CheckboxPrimitive.Indicator indeterminate asChild>
            <Icon icon='ph--minus--regular' classNames={tx('field.checkboxIndicator', { size })} />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Control>
        {children && (
          <CheckboxPrimitive.Label className={tx('field.controlLabel', {})}>{children}</CheckboxPrimitive.Label>
        )}
        <CheckboxPrimitive.HiddenInput
          aria-describedby={field?.ariaDescribedby}
          {...(validationValence === 'error' && { 'aria-errormessage': field?.ids.errorText })}
          ref={useComposedRefs(forwardedRef, inputRef)}
        />
      </CheckboxPrimitive.RootProvider>
    );
  },
);

Checkbox.displayName = 'Field.Checkbox';

//
// Switch
//

type SwitchProps = ThemedClassName<
  Omit<ComponentPropsWithRef<'input'>, 'children' | 'onChange'> & {
    onCheckedChange?: (checked: boolean) => void;
    /** The control's own label, laid out beside it; without one a `Field.Label` names the control. */
    children?: ReactNode;
  }
>;

/** The standard switch: with `children` a `<label>` around the control and its text, as `Checkbox` does. */
const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      classNames,
      checked: propsChecked,
      defaultChecked: propsDefaultChecked,
      onCheckedChange: propsOnCheckedChange,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const [checked, onCheckedChange] = useControllableState({
      prop: propsChecked,
      defaultProp: propsDefaultChecked ?? false,
      onChange: propsOnCheckedChange,
    });

    const field = useFieldContext();
    const { validationValence } = useFieldValence(FIELD_NAME);

    const control = (
      <input
        type='checkbox'
        className={tx('field.switch', { disabled: props.disabled }, classNames)}
        checked={checked}
        onChange={(event) => {
          onCheckedChange(event.target.checked);
        }}
        id={field?.ids.control}
        aria-describedby={field?.ariaDescribedby}
        {...props}
        {...(validationValence === 'error' && {
          'aria-invalid': 'true' as const,
          'aria-errormessage': field?.ids.errorText,
        })}
        ref={forwardedRef}
      />
    );

    return children ? (
      <label className={tx('field.checkboxRoot', { disabled: props.disabled })}>
        {control}
        <span className={tx('field.controlLabel', {})}>{children}</span>
      </label>
    ) : (
      control
    );
  },
);
Switch.displayName = 'Field.Switch';

//
// Wrapper for Switch/Checkbox to center them within the input row height.
//

const Block = forwardRef<HTMLDivElement, PropsWithChildren>(({ children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <div {...props} className={tx('field.block')} ref={forwardedRef}>
      {children}
    </div>
  );
});

Block.displayName = 'Field.Block';

//
// Date / Time / DateTime — segmented react-aria-components fields with locale-aware ordering,
// spinbutton semantics, and immutable separators. ISO string API:
//   - Date     `YYYY-MM-DD`
//   - Time     `HH:mm`
//   - DateTime `YYYY-MM-DDTHH:mm`
// Pair `Field.Date` or `Field.DateTime` with a sibling `Field.TriggerIcon` inside an
// `Field.Root` to expose a calendar popover; `Field.Time` has no picker.
//

const Time = SegmentedTime;
const Date = SegmentedDate;
const DateTime = SegmentedDateTime;

type TimeProps = SegmentedTimeProps;
type DateInputProps = SegmentedDateProps;
type DateTimeInputProps = SegmentedDateTimeProps;

//
// Input
//

export const Field = {
  Root,
  TriggerIcon,
  PinInput,
  Input,
  Textarea,
  Time,
  Date,
  DateTime,
  Checkbox,
  Switch,
  Block,
  Label,
  HelperText,
  ErrorText,
};

export type {
  CheckboxProps,
  CheckedState,
  DateInputProps,
  DateTimeInputProps,
  ErrorTextProps,
  FieldRootProps,
  FieldSharedProps,
  FieldValence,
  HelperTextProps,
  InputProps,
  InputVariant,
  LabelProps,
  PinInputProps,
  SwitchProps,
  TextareaProps,
  TimeProps,
};
