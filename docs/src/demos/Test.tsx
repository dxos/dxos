//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

const Test = () => {
  const [value, setValue] = useState<number | null>(null);

  return (
    <button onClick={() => setValue((value) => (value ? value + 1 : 1))}>
      {value ?? 0}
    </button>
  );
};

export default Test;
