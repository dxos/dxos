//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

export const Test = () => {
  const [counter, setCounter] = useState(0);
  useEffect(() => {
    const i = setInterval(() => {
      setCounter((counter) => counter + 1);
    }, 1_000);
    return () => clearInterval(i);
  }, []);

  return <div>Counter = {counter}</div>;
};
