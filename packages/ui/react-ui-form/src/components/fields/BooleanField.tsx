//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { useFormContext } from '../../hooks/index.ts';
import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';

/** A Switch that labels itself, except in a settings row, whose header column holds the label. */
export const BooleanField = ({
  type,
  format,
  label,
  readonly,
  presentation,
  indeterminate,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<boolean>) => {
  const { t } = Hooks.useTranslation(translationKey);
  const { variant } = useFormContext('Form.BooleanField');
  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  return (
    <Input.Switch
      // A switch has no third state: an indeterminate one is dimmed and says so, and the first press sets it.
      indeterminate={indeterminate}
      label={
        variant === 'settings' ? undefined : indeterminate ? `${label} (${t('indeterminate.placeholder')})` : label
      }
      disabled={!!readonly}
      checked={!!value}
      // A toggle is a commit: the switch never blurs, so it commits itself.
      onCheckedChange={({ checked }) => {
        onValueChange(type, checked);
        onBlur();
      }}
    />
  );
};

BooleanField.labelPlacement = 'beside' as const;
