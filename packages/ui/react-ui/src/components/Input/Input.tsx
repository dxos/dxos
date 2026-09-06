//
// Copyright 2023 DXOS.org
//

// `Input` — a labelled control on Ark's field: the field owns the ids and the wiring between a
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
import { INPUT_NAME, type InputValence, InputValenceProvider, useInputValence } from './InputContext';
import { type InputTriggerHandler, InputTriggerProvider, useInputTriggerContext } from './InputTriggerContext';
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

type InputSharedProps = Partial<{ density: Density; elevation: Elevation; variant: InputVariant }>;

//
// Root — the field, with the trigger registry a date field's picker button reaches through.
//

type InputRootProps = ThemedClassName<
  PropsWithChildren<{
    /** The control's id, which the label points at; generated when absent. */
    id?: string;
    /** The tone of the validation message; `error` is what the field reports as invalid. */
    validationValence?: InputValence;
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
}: InputRootProps) => {
  const { tx } = useThemeContext();
  const handlerRef = useRef<InputTriggerHandler | null>(null);
  const [hasTrigger, setHasTrigger] = useState(false);

  const registerTrigger = useCallback((handler: InputTriggerHandler) => {
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
    <InputTriggerProvider registerTrigger={registerTrigger} trigger={trigger} hasTrigger={hasTrigger}>
      <InputValenceProvider validationValence={validationValence}>
        {/* The field needs an element to watch its texts from; `contents` keeps it out of the layout. */}
        <FieldPrimitive.Root
          id={id}
          invalid={validationValence === 'error'}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          asChild={asChild}
          className={tx('input.root', {}, classNames)}
        >
          {children}
        </FieldPrimitive.Root>
      </InputValenceProvider>
    </InputTriggerProvider>
  );
};

Root.displayName = 'Input.Root';

//
// TriggerIcon — sibling button that opens the picker of the registered field. Renders nothing
// when no field in the surrounding `Input.Root` has registered an opener.
//

// `label` and `icon` have defaults below, so both are optional for callers (e.g. `<Input.TriggerIcon />`).
// `onClick` is reserved — the trigger always opens the registered picker.
type TriggerIconProps = Omit<IconButtonProps, 'label' | 'onClick'> & { label?: string };

const TriggerIcon = forwardRef<HTMLButtonElement, TriggerIconProps>(
  ({ classNames, icon = 'ph--calendar--regular', 'aria-label': ariaLabel, label, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const ctx = useInputTriggerContext('Input.TriggerIcon');
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

TriggerIcon.displayName = 'Input.TriggerIcon';

//
// Label
//

type LabelProps = ThemedClassName<ComponentPropsWithRef<typeof FieldPrimitive.Label>> & { srOnly?: boolean };

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ classNames, children, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <FieldPrimitive.Label {...props} className={tx('input.label', { srOnly }, classNames)} ref={forwardedRef}>
      {children}
    </FieldPrimitive.Label>
  );
});

Label.displayName = 'Input.Label';

//
// Description
//

type DescriptionProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof ark.span>, 'id'>> & { srOnly?: boolean };

/**
 * What describes the control. While the field is valid the whole `DescriptionAndValidation` row
 * does, so this is plain text inside it; once invalid the validation becomes the error message and
 * this alone is the helper text the field points `aria-describedby` at.
 */
const Description = forwardRef<HTMLSpanElement, DescriptionProps>(
  ({ classNames, children, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { validationValence } = useInputValence(INPUT_NAME);
    const Comp = validationValence === 'error' ? FieldPrimitive.HelperText : ark.span;
    return (
      <Comp {...props} className={tx('input.description', { srOnly }, classNames)} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

Description.displayName = 'Input.Description';

//
// Validation
//

type ValidationProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof ark.span>, 'id'>> & { srOnly?: boolean };

/**
 * The validation message, coloured by the valence. An error is the field's error text — the control
 * names it through `aria-errormessage` and it announces itself — while any other tone is plain text.
 */
const Validation = forwardRef<HTMLSpanElement, ValidationProps>(
  ({ classNames, children, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { validationValence } = useInputValence(INPUT_NAME);
    const Comp = validationValence === 'error' ? FieldPrimitive.ErrorText : ark.span;
    return (
      <Comp {...props} className={tx('input.validation', { srOnly, validationValence }, classNames)} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

Validation.displayName = 'Input.Validation';

//
// DescriptionAndValidation
//

type DescriptionAndValidationProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof ark.p>, 'id'>> & {
  srOnly?: boolean;
};

/**
 * The row under the control. While the field is valid it is the helper text as a whole (description
 * and any non-error message); once invalid the parts inside speak for themselves (see `Description`).
 */
const DescriptionAndValidation = forwardRef<HTMLParagraphElement, DescriptionAndValidationProps>(
  ({ classNames, children, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { validationValence } = useInputValence(INPUT_NAME);
    const paragraph = (
      <p {...props} className={tx('input.descriptionAndValidation', { srOnly }, classNames)} ref={forwardedRef}>
        {children}
      </p>
    );
    return validationValence === 'error' ? (
      paragraph
    ) : (
      <FieldPrimitive.HelperText asChild>{paragraph}</FieldPrimitive.HelperText>
    );
  },
);

DescriptionAndValidation.displayName = 'Input.DescriptionAndValidation';

//
// PinInput
//

type PinInputProps = ThemedClassName<InputSharedProps & Omit<PinInputPrimitiveProps, 'className' | 'segmentClassName'>>;

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
        className={tx('input.pin', { disabled: props.disabled }, classNames) || ''}
        segmentClassName={tx('input.segment', { disabled: props.disabled, density, elevation }) || ''}
        ref={forwardedRef}
      />
    );
  },
);

PinInput.displayName = 'Input.PinInput';

//
// TextInput
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

type TextInputProps = InputSharedProps &
  ThemedClassName<Omit<ComponentPropsWithRef<typeof FieldPrimitive.Input>, 'id'>> &
  AutoFillProps &
  AdornmentProps;

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    { classNames, density: densityProp, elevation: elevationProp, variant, noAutoFill, start, end, ...props },
    forwardedRef,
  ) => {
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(densityProp);
    const elevation = useElevationContext(elevationProp);
    const { validationValence } = useInputValence(INPUT_NAME);
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
          'input.input',
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
        className={tx('input.container', { variant, disabled: props.disabled, density, validationValence }, classNames)}
      >
        {start != null && <span className={tx('input.adornment', { side: 'start' })}>{start}</span>}
        {field}
        {end != null && <span className={tx('input.adornment', { side: 'end' })}>{end}</span>}
      </div>
    );
  },
);

TextInput.displayName = 'Input.TextInput';

//
// TextArea
//

type TextAreaProps = InputSharedProps &
  ThemedClassName<Omit<ComponentPropsWithRef<typeof FieldPrimitive.Textarea>, 'id'>>;

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ classNames, density: propsDensity, elevation: propsElevation, variant, ...props }, forwardedRef) => {
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);
    const { validationValence } = useInputValence(INPUT_NAME);

    return (
      <FieldPrimitive.Textarea
        {...props}
        data-density={density}
        className={tx(
          'input.textArea',
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

TextArea.displayName = 'Input.TextArea';

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
};

/**
 * A native checkbox, visually hidden, behind a styled control. The `Input.Root` id lands on the
 * input so `Input.Label` reaches it; everything else (test ids, handlers) lands on the visible
 * control, which is what a pointer or a test hits.
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
      ...props
    },
    forwardedRef,
  ) => {
    // The field owns the id and the described-by/error wiring; the valence is ours.
    const field = useFieldContext();
    const { validationValence } = useInputValence(INPUT_NAME);
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
      <CheckboxPrimitive.RootProvider value={checkbox} className='contents'>
        <CheckboxPrimitive.Control
          {...props}
          // Focusable by pointer only, so a press lands focus here (as it did on the button this
          // replaces) instead of on the nearest focusable ancestor, which a tree row re-renders on.
          tabIndex={-1}
          onClick={handleClick}
          className={tx('input.checkbox', { size }, 'shrink-0', classNames)}
        >
          <CheckboxPrimitive.Indicator asChild>
            <Icon icon='ph--check--regular' classNames={tx('input.checkboxIndicator', { size })} />
          </CheckboxPrimitive.Indicator>
          <CheckboxPrimitive.Indicator indeterminate asChild>
            <Icon icon='ph--minus--regular' classNames={tx('input.checkboxIndicator', { size })} />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Control>
        <CheckboxPrimitive.HiddenInput
          aria-describedby={field?.ariaDescribedby}
          {...(validationValence === 'error' && { 'aria-errormessage': field?.ids.errorText })}
          ref={useComposedRefs(forwardedRef, inputRef)}
        />
      </CheckboxPrimitive.RootProvider>
    );
  },
);

Checkbox.displayName = 'Input.Checkbox';

//
// Switch
//

type SwitchProps = ThemedClassName<
  Omit<ComponentPropsWithRef<'input'>, 'children' | 'onChange'> & { onCheckedChange?: (checked: boolean) => void }
>;

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      classNames,
      checked: propsChecked,
      defaultChecked: propsDefaultChecked,
      onCheckedChange: propsOnCheckedChange,
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

    // The field owns the id and the described-by/error wiring; the valence is ours.
    const field = useFieldContext();
    const { validationValence } = useInputValence(INPUT_NAME);

    return (
      <input
        type='checkbox'
        className={tx('input.switch', { disabled: props.disabled }, classNames)}
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
  },
);

Switch.displayName = 'Input.Switch';

//
// Wrapper for Switch/Checkbox to center them within the input row height.
//

const Block = forwardRef<HTMLDivElement, PropsWithChildren>(({ children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <div {...props} className={tx('input.block')} ref={forwardedRef}>
      {children}
    </div>
  );
});

Block.displayName = 'Input.Block';

//
// Date / Time / DateTime — segmented react-aria-components fields with locale-aware ordering,
// spinbutton semantics, and immutable separators. ISO string API:
//   - Date     `YYYY-MM-DD`
//   - Time     `HH:mm`
//   - DateTime `YYYY-MM-DDTHH:mm`
// Pair `Input.Date` or `Input.DateTime` with a sibling `Input.TriggerIcon` inside an
// `Input.Root` to expose a calendar popover; `Input.Time` has no picker.
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

export const Input = {
  Root,
  TriggerIcon,
  PinInput,
  TextInput,
  TextArea,
  Time,
  Date,
  DateTime,
  Checkbox,
  Switch,
  Block,
  Label,
  Description,
  Validation,
  DescriptionAndValidation,
};

export type {
  CheckboxProps,
  CheckedState,
  DateInputProps,
  DateTimeInputProps,
  DescriptionAndValidationProps,
  DescriptionProps,
  InputRootProps,
  InputSharedProps,
  InputValence,
  InputVariant,
  LabelProps,
  PinInputProps,
  SwitchProps,
  TextAreaProps,
  TextInputProps,
  TimeProps,
  ValidationProps,
};
