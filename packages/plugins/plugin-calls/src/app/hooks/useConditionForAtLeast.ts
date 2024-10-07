//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react'

export const useConditionForAtLeast = (condition: boolean, time: number) => {
  const [value, setValue] = useState(condition);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setValue(condition);
    }, time);
    return () => {
      clearTimeout(timeout);
    };
  }, [condition, time]);

  return value;
};
