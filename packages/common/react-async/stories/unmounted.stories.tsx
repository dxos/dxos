//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useMounted } from '../src';

export default {
  title: 'react-async/unmounted'
};

const AsyncComponent = ({ nocheck = false }: { nocheck?: boolean }) => {
  const [value, setValue] = useState('Processing...');
  const isMounted = useMounted();
  useEffect(() => {
    setTimeout(() => {
      if (nocheck || isMounted()) {
        // Check if still mounted.
        setValue('Done');
      }
    }, 2000);
  }, []);

  return <div>{value}</div>;
};

const TestApp = () => {
  const [show, setShow] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setShow(false); // Remove element.
    }, 1000);
  }, []);

  if (!show) {
    return null;
  }

  return <AsyncComponent nocheck />;
};

export const Primary = () => (
  <div style={{ padding: 16 }}>
    <TestApp />
  </div>
);
