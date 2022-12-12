//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';

export const Counter: FC<{ interval?: number }> = ({ interval = 1_000 }) => {
  const [counter, setCounter] = useState(0);
  useEffect(() => {
    const i = setInterval(() => {
      setCounter((counter) => counter + 1);
    }, interval);
    return () => clearInterval(i);
  }, []);

  return <div>Counter = {counter}</div>;
};
