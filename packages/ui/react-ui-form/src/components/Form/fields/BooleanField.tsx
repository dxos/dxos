//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';

import { translationKey } from '../../../translations';
import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

export const BooleanField = ({
  type,
  label,
  inputOnly,
  getStatus,
  getValue,
  onValueChange,
  readonly,
}: FormFieldComponentProps) => {
  const { status, error } = getStatus();
  const checked = Boolean(getValue());
  const { t } = useTranslation(translationKey);

  return (
    <Input.Root validationValence={status}>
      {!inputOnly && <FormFieldLabel error={error} label={label} />}
      {readonly === 'static' ? (
        <p>{t(checked ? 'boolean input true value' : 'boolean input false value')}</p>
      ) : (
        <Input.Switch disabled={!!readonly} checked={checked} onCheckedChange={(value) => onValueChange(type, value)} />
      )}
      {inputOnly && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};
