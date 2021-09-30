//
// Copyright 2020 DXOS.org
//

import { IconButton } from '@mui/material';
import React from 'react';

interface TypeMap {
  [key: string]: Function;
}

// TODO(burdon): Use ToggleButton, ToggleButtonGroup (react 5; currently incompatible with storybook).
const ToggleGroup = ({ types, type, onChange }: { types: TypeMap, type: string, onChange: (key: string) => void }) => {
  return (
    <div>
      {Object.entries(types).map(([key, Icon]) => (
        <IconButton key={key} disabled={key === type} onClick={() => onChange(key)}>
          <Icon />
        </IconButton>
      ))}
    </div>
  );
};

export default ToggleGroup;
