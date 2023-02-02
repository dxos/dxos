//
// Copyright 2022 DXOS.org
//

import { ComponentProps, ComponentPropsWithoutRef, ReactNode } from 'react';

import { MessageValence } from '../../props';

export type InputSize = 'md' | 'lg' | 'pin' | 'textarea';

interface SharedTextInputProps {
  label: ReactNode;
  placeholder?: string;
  labelVisuallyHidden?: boolean;
  description?: ReactNode;
  descriptionVisuallyHidden?: boolean;
  initialValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: InputSize;
  validationMessage?: ReactNode;
  validationValence?: MessageValence;
  length?: number;
}

interface SharedSlots {
  root?: Omit<ComponentProps<'div'>, 'children'>;
  label?: Omit<ComponentProps<'label'>, 'children'>;
  description?: Pick<ComponentProps<'span'>, 'className'>;
  validation?: Pick<ComponentProps<'span'>, 'className'>;
}

export interface InputSlots extends SharedSlots {
  input?: Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'onChange' | 'size' | 'disabled' | 'placeholder'>;
}

export interface TextareaSlots extends SharedSlots {
  input?: Omit<ComponentPropsWithoutRef<'textarea'>, 'value' | 'onChange' | 'size' | 'disabled' | 'placeholder'>;
}

export interface InputProps extends SharedTextInputProps {
  slots?: InputSlots;
}

export interface TextareaProps extends SharedTextInputProps {
  slots?: TextareaSlots;
}
