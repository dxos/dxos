//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { typeMeta } from '@dxos/react-client-testing';

import { IconRadio, IconRadioGroup } from '../IconRadio';

// TODO(burdon): Use ToggleButtonGroup

interface TypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const TypeSelector = ({ value: controlledValue, onChange }: TypeSelectorProps) => {
  const [value, setValue] = useState(controlledValue);
  useEffect(() => {
    setValue(controlledValue);
  }, [controlledValue]);

  const handleChange = (value: string) => {
    onChange(value);
    setValue(value);
  };

  return (
    <IconRadioGroup value={value} onChange={handleChange}>
      {Object.entries(typeMeta).map(([key, { icon: Icon }]) => (
        <IconRadio key={key} value={key} size='small'>
          <Icon />
        </IconRadio>
      ))}
    </IconRadioGroup>
  );
};
