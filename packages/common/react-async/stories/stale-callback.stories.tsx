//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useStateWithRef } from '../src/index.js';

export default {
  title: 'react-async/stale-callback'
};

export const Primary = () => {
  const [value, setValue, valueRef] = useStateWithRef(0);
  const [result, setResult] = useState({});

  useEffect(() => {
    let counter = 0;
    const i = setInterval(() => {
      setValue(++counter);
    }, 1000);

    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setResult({
        value, // Value will be 0.
        ref: valueRef.current // Ref will be 5.
      });
    }, 5000);

    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: 16 }}>
      <div style={{ paddingLeft: 16 }}>Value: {value}</div>
      <div style={{ paddingLeft: 16 }}>Result: {JSON.stringify(result)}</div>
    </div>
  );
};
