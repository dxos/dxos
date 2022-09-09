//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { Button } from '@mui/material';

export const MaterialWithState = () => {
  const [count, setCount] = React.useState(1);

  return (
    <div>
      Hello!!
      <Button onClick={() => {
        setCount(count + 1);
      }}>click!</Button>
      <p>CLICKs: { count }</p>
    </div>
  );
};
