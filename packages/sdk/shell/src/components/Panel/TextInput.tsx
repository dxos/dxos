//
// Copyright 2023 DXOS.org
//

import React, { type ChangeEventHandler, type ReactNode } from 'react';

import { Next } from '@dxos/react-ui/next';

export type InputProps = Next.InputProps & {
  validationMessage?: string;
  label?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
};

/**
 * @deprecated use react-ui directly.
 */
export const TextInput = ({ validationMessage, label, ...props }: InputProps) => {
  return (
    <Next.Field.Root>
      <Next.Field.Label>{label}</Next.Field.Label>
      <Next.Input {...props} classNames='py-2 mt-2 text-center' />
      {validationMessage && <Next.Field.ErrorText>{validationMessage}</Next.Field.ErrorText>}
    </Next.Field.Root>
  );
};
