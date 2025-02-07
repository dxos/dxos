//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SelectOption } from '@dxos/echo-schema';
import { Input, useTranslation } from '@dxos/react-ui';

import { translationKey } from '../../../translations';
import { InputHeader, type InputProps } from '../Input';

export const SelectOptionInput = ({
  type,
  label,
  disabled,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps) => {
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();
  const options = getValue<SelectOption[] | undefined>();

  React.useEffect(() => {
    if (options === undefined) {
      onValueChange(type, []);
    }
  }, [options, onValueChange, type]);

  const onClick = React.useCallback(() => {
    const options = [
      { id: 'one', title: 'One', color: 'red' },
      { id: 'two', title: 'Two', color: 'blue' },
      { id: 'three', title: 'Three', color: 'green' },
    ];
    onValueChange(type, options);
  }, [type, onValueChange]);

  // TODO(ZaymonFC): WIP.
  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error}>
        <Input.Label>{label}</Input.Label>
        <button onClick={onClick}>+</button>
      </InputHeader>
    </Input.Root>
  );
};
