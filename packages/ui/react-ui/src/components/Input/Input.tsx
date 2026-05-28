//
// Copyright 2023 DXOS.org
//

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentPropsWithRef,
  type ForwardRefExoticComponent,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DescriptionAndValidation as DescriptionAndValidationPrimitive,
  type DescriptionAndValidationProps as DescriptionAndValidationPrimitiveProps,
  Description as DescriptionPrimitive,
  type DescriptionProps as DescriptionPrimitiveProps,
  INPUT_NAME,
  InputRoot,
  type InputRootProps,
  type InputScopedProps,
  Label as LabelPrimitive,
  type LabelProps as LabelPrimitiveProps,
  PinInput as PinInputPrimitive,
  type PinInputProps as PinInputPrimitiveProps,
  TextArea as TextAreaPrimitive,
  type TextAreaProps as TextAreaPrimitiveProps,
  TextInput as TextInputPrimitive,
  type TextInputProps as TextInputPrimitiveProps,
  Validation as ValidationPrimitive,
  type ValidationProps as ValidationPrimitiveProps,
  useInputContext,
} from '@dxos/react-input';
import { mx } from '@dxos/ui-theme';
import { type Density, type Elevation, type Size } from '@dxos/ui-types';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon } from '../Icon';
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
// Trigger context — lets a sibling `Input.TriggerIcon` open a picker registered by a field inside
// the same `Input.Root`. Each registered handler is keyed; the most recent registration wins.
//

type InputTriggerHandler = () => void;

type InputTriggerContextValue = {
  registerTrigger: (handler: InputTriggerHandler) => () => void;
  trigger: () => void;
  hasTrigger: boolean;
};

const InputTriggerContext = createContext<InputTriggerContextValue | undefined>(undefined);

/**
 * Field hook. Pass an opener function; while the field is mounted, an `Input.TriggerIcon`
 * sibling will call this opener on press. Returns a no-op when used outside `Input.Root`.
 */
const useInputTrigger = (handler: InputTriggerHandler | undefined) => {
  const ctx = useContext(InputTriggerContext);
  useEffect(() => {
    if (!ctx || !handler) {
      return;
    }
    return ctx.registerTrigger(handler);
  }, [ctx, handler]);
};

//
// Root — wraps the @dxos/react-input primitive root with the trigger registry.
//

const Root = (props: InputRootProps) => {
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

  const value = useMemo(() => ({ registerTrigger, trigger, hasTrigger }), [registerTrigger, trigger, hasTrigger]);

  return (
    <InputTriggerContext.Provider value={value}>
      <InputRoot {...props} />
    </InputTriggerContext.Provider>
  );
};

Root.displayName = 'Input.Root';

//
// TriggerIcon — sibling button that opens the picker of the registered field. Renders nothing
// when no field in the surrounding `Input.Root` has registered an opener.
//

type TriggerIconProps = ThemedClassName<
  Omit<ComponentPropsWithRef<'button'>, 'children' | 'onClick'> & {
    icon?: string;
  }
>;

const TriggerIcon = forwardRef<HTMLButtonElement, TriggerIconProps>(
  ({ classNames, icon = 'ph--calendar--regular', 'aria-label': ariaLabel, ...props }, forwardedRef) => {
    const ctx = useContext(InputTriggerContext);
    const { tx } = useThemeContext();
    if (!ctx?.hasTrigger) {
      return null;
    }

    return (
      <button
        type='button'
        ref={forwardedRef}
        aria-label={ariaLabel ?? 'Open picker'}
        {...props}
        onClick={ctx.trigger}
        className={tx('input.triggerIcon', {}, classNames) ?? undefined}
      >
        <Icon size={4} icon={icon} />
      </button>
    );
  },
);

TriggerIcon.displayName = 'Input.TriggerIcon';

//
// Label
//

type LabelProps = ThemedClassName<LabelPrimitiveProps> & { srOnly?: boolean };

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ classNames, children, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <LabelPrimitive {...props} className={tx('input.label', { srOnly }, classNames)} ref={forwardedRef}>
      {children}
    </LabelPrimitive>
  );
});

Label.displayName = 'Input.Label';

//
// Description
//

type DescriptionProps = ThemedClassName<DescriptionPrimitiveProps> & { srOnly?: boolean };

const Description = forwardRef<HTMLSpanElement, DescriptionProps>(
  ({ classNames, children, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DescriptionPrimitive {...props} className={tx('input.description', { srOnly }, classNames)} ref={forwardedRef}>
        {children}
      </DescriptionPrimitive>
    );
  },
);

Description.displayName = 'Input.Description';

//
// Validation
//

type ValidationProps = ThemedClassName<ValidationPrimitiveProps> & { srOnly?: boolean };

const Validation = forwardRef<HTMLSpanElement, InputScopedProps<ValidationProps>>(
  ({ __inputScope, classNames, children, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { validationValence } = useInputContext(INPUT_NAME, __inputScope);
    return (
      <ValidationPrimitive
        {...props}
        className={tx('input.validation', { srOnly, validationValence }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </ValidationPrimitive>
    );
  },
);

Validation.displayName = 'Input.Validation';

//
// DescriptionAndValidation
//

type DescriptionAndValidationProps = ThemedClassName<DescriptionAndValidationPrimitiveProps> & { srOnly?: boolean };

const DescriptionAndValidation = forwardRef<HTMLParagraphElement, DescriptionAndValidationProps>(
  ({ classNames, children, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DescriptionAndValidationPrimitive
        {...props}
        className={tx('input.descriptionAndValidation', { srOnly }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </DescriptionAndValidationPrimitive>
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
        className={tx('input.inputWithSegments', { disabled: props.disabled }, classNames) || ''}
        segmentClassName={tx('input.segment', { disabled: props.disabled, density, elevation }) || ''}
        ref={forwardedRef}
      />
    );
  },
);

PinInput.displayName = 'Input.PinInput';

//
// TextInput
// TODO(burdon): Implement inline icon within button: e.g., https://www.radix-ui.com/themes/playground#text-field
//

type AutoFillProps = {
  noAutoFill?: boolean;
};

type TextInputProps = InputSharedProps & ThemedClassName<TextInputPrimitiveProps> & AutoFillProps;

const TextInput = forwardRef<HTMLInputElement, InputScopedProps<TextInputProps>>(
  (
    { __inputScope, classNames, density: densityProp, elevation: elevationProp, variant, noAutoFill, ...props },
    forwardedRef,
  ) => {
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(densityProp);
    const elevation = useElevationContext(elevationProp);
    const { validationValence } = useInputContext(INPUT_NAME, __inputScope);

    return (
      <TextInputPrimitive
        {...props}
        // TODO(wittjosiah): Factor out autofill properies.
        {...{ 'data-1p-ignore': noAutoFill }}
        className={tx(
          'input.input',
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

TextInput.displayName = 'Input.TextInput';

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
const Date_ = SegmentedDate;
const DateTime = SegmentedDateTime;

type TimeProps = SegmentedTimeProps;
type DateInputProps = SegmentedDateProps;
type DateTimeInputProps = SegmentedDateTimeProps;

//
// TextArea
//

type TextAreaProps = InputSharedProps & ThemedClassName<TextAreaPrimitiveProps>;

const TextArea = forwardRef<HTMLTextAreaElement, InputScopedProps<TextAreaProps>>(
  ({ __inputScope, classNames, density: propsDensity, elevation: propsElevation, variant, ...props }, forwardedRef) => {
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);
    const { validationValence } = useInputContext(INPUT_NAME, __inputScope);

    return (
      <TextAreaPrimitive
        {...props}
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

type CheckboxProps = ThemedClassName<Omit<CheckboxPrimitive.CheckboxProps, 'children'>> & {
  size?: Size;
};

const Checkbox: ForwardRefExoticComponent<CheckboxProps> = forwardRef<
  HTMLButtonElement,
  InputScopedProps<CheckboxProps>
>(
  (
    {
      __inputScope,
      classNames,
      checked: propsChecked,
      defaultChecked: propsDefaultChecked,
      onCheckedChange: propsOnCheckedChange,
      size,
      ...props
    },
    forwardedRef,
  ) => {
    const [checked, onCheckedChange] = useControllableState({
      prop: propsChecked,
      defaultProp: propsDefaultChecked,
      onChange: propsOnCheckedChange,
    });
    const { id, validationValence, descriptionId, errorMessageId } = useInputContext(INPUT_NAME, __inputScope);
    const { tx } = useThemeContext();

    return (
      <CheckboxPrimitive.Root
        {...{
          ...props,
          checked,
          onCheckedChange,
          id,
          'aria-describedby': descriptionId,
          ...(validationValence === 'error' && {
            'aria-invalid': 'true' as const,
            'aria-errormessage': errorMessageId,
          }),
          className: tx('input.checkbox', { size }, 'shrink-0', classNames),
        }}
        ref={forwardedRef}
      >
        <Icon
          icon={checked === 'indeterminate' ? 'ph--minus--regular' : 'ph--check--regular'}
          classNames={tx('input.checkboxIndicator', { size, checked })}
        />
      </CheckboxPrimitive.Root>
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

const Switch = forwardRef<HTMLInputElement, InputScopedProps<SwitchProps>>(
  (
    {
      __inputScope,
      classNames,
      checked: propsChecked,
      defaultChecked: propsDefaultChecked,
      onCheckedChange: propsOnCheckedChange,
      ...props
    },
    forwardedRef,
  ) => {
    const [checked, onCheckedChange] = useControllableState({
      prop: propsChecked,
      defaultProp: propsDefaultChecked ?? false,
      onChange: propsOnCheckedChange,
    });

    const { id, validationValence, descriptionId, errorMessageId } = useInputContext(INPUT_NAME, __inputScope);

    return (
      <input
        type='checkbox'
        className={mx('dx-checkbox--switch dx-focus-ring', classNames)}
        checked={checked}
        onChange={(event) => {
          onCheckedChange(event.target.checked);
        }}
        id={id}
        aria-describedby={descriptionId}
        {...props}
        {...(validationValence === 'error' && {
          'aria-invalid': 'true' as const,
          'aria-errormessage': errorMessageId,
        })}
        ref={forwardedRef}
      />
    );
  },
);

Switch.displayName = 'Input.Switch';

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
  Date: Date_,
  DateTime,
  Checkbox,
  Switch,
  Label,
  Description,
  Validation,
  DescriptionAndValidation,
};

export { useInputTrigger };

export type {
  InputVariant,
  InputRootProps,
  InputSharedProps,
  PinInputProps,
  TextInputProps,
  TextAreaProps,
  TimeProps,
  DateInputProps,
  DateTimeInputProps,
  CheckboxProps,
  SwitchProps,
  LabelProps,
  DescriptionProps,
  ValidationProps,
  DescriptionAndValidationProps,
};
