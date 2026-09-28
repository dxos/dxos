//
// Copyright 2026 DXOS.org
//

import { PasswordInput as PasswordInputPrimitive, usePasswordInputContext } from '@ark-ui/react/password-input';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { Button } from '../Button/index.ts';

export type PasswordInputProps = ThemedClassName<
  Pick<
    PasswordInputPrimitive.RootProps,
    | 'visible'
    | 'defaultVisible'
    | 'autoComplete'
    | 'ignorePasswordManagers'
    | 'disabled'
    | 'readOnly'
    | 'required'
    | 'invalid'
    | 'name'
  >
> & {
  'value'?: string;
  'defaultValue'?: string;
  'onValueChange'?: (value: string) => void;
  'onVisibleChange'?: (visible: boolean) => void;
  'placeholder'?: string;
  'autoFocus'?: boolean;
  'showLabel'?: string;
  'hideLabel'?: string;
  'aria-label'?: string;
  'data-testid'?: string;
};

type VisibilityTriggerProps = Pick<PasswordInputProps, 'showLabel' | 'hideLabel'>;

/** The eye toggle names the action it performs, which follows the machine's visibility. */
const VisibilityTrigger = ({ showLabel = 'Show password', hideLabel = 'Hide password' }: VisibilityTriggerProps) => {
  const { visible } = usePasswordInputContext();
  return (
    <PasswordInputPrimitive.VisibilityTrigger asChild>
      <Button
        icon={visible ? 'ph--eye-slash--regular' : 'ph--eye--regular'}
        label={visible ? hideLabel : showLabel}
        iconOnly
        variant='ghost'
        showTooltip={false}
      />
    </PasswordInputPrimitive.VisibilityTrigger>
  );
};

/**
 * Ark password input in a control row with a trailing visibility toggle (zag keeps the input focused and the toggle
 * out of the tab order). `ignorePasswordManagers` sets the managers' opt-out attributes, as Input's `noAutoFill`.
 * Inside a `Field.Root` the input takes the field's id, label, description and state. `data-testid` goes to the row,
 * the ref to the input.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      classNames,
      value,
      defaultValue,
      onValueChange,
      onVisibleChange,
      placeholder,
      autoFocus,
      showLabel,
      hideLabel,
      'aria-label': ariaLabel,
      'data-testid': testId,
      ...props
    },
    forwardedRef,
  ) => (
    <PasswordInputPrimitive.Root
      {...props}
      onVisibilityChange={onVisibleChange && (({ visible }) => onVisibleChange(visible))}
      className={recipes.controlRoot()}
    >
      <PasswordInputPrimitive.Control data-testid={testId} className={mx(recipes.passwordInput(), classNames)}>
        <PasswordInputPrimitive.Input
          value={value}
          defaultValue={defaultValue}
          onChange={onValueChange && ((event) => onValueChange(event.target.value))}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          className={recipes.inputField()}
          ref={forwardedRef}
        />
        <span data-scope='password-input' data-part='end' className={recipes.inputAdornment()}>
          <VisibilityTrigger showLabel={showLabel} hideLabel={hideLabel} />
        </span>
      </PasswordInputPrimitive.Control>
    </PasswordInputPrimitive.Root>
  ),
);

PasswordInput.displayName = 'Next.PasswordInput';
