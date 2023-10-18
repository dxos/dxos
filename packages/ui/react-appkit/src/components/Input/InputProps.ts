//
// Copyright 2022 DXOS.org
//

import { type ComponentPropsWithoutRef, type ComponentPropsWithRef, type ReactNode } from 'react';

import type { Density, Elevation, MessageValence } from '@dxos/aurora';

export type InputSize = 'md' | 'lg' | 'pin' | 'textarea';

export type InputVariant = 'default' | 'subdued';

interface SharedTextInputProps
  extends Pick<ComponentPropsWithRef<'input'>, 'value' | 'defaultValue' | 'onChange' | 'disabled' | 'placeholder'> {
  label: ReactNode;
  labelVisuallyHidden?: boolean;
  description?: ReactNode;
  descriptionVisuallyHidden?: boolean;
  size?: InputSize;
  validationMessage?: ReactNode;
  validationValence?: MessageValence;
  length?: number;
  variant?: InputVariant;
  elevation?: Elevation;
  density?: Density;
}

interface SharedSlots {
  root?: Omit<ComponentPropsWithoutRef<'div'>, 'children'>;
  label?: Omit<ComponentPropsWithoutRef<'label'>, 'children'>;
  description?: Pick<ComponentPropsWithoutRef<'span'>, 'className'>;
  validation?: Pick<ComponentPropsWithoutRef<'span'>, 'className'>;
}

export interface InputSlots extends SharedSlots {
  input?: Omit<
    ComponentPropsWithoutRef<'input'>,
    'value' | 'defaultValue' | 'onChange' | 'size' | 'disabled' | 'placeholder'
  >;
}

export interface TextareaSlots extends SharedSlots {
  input?: Omit<
    ComponentPropsWithoutRef<'textarea'>,
    'value' | 'defaultValue' | 'onChange' | 'size' | 'disabled' | 'placeholder'
  >;
}

export interface InputProps extends SharedTextInputProps {
  slots?: InputSlots;
}

export interface TextareaProps extends SharedTextInputProps {
  slots?: TextareaSlots;
}
