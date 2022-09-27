//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

const Test = () => {
  const [value, setValue] = useState(0);

  return (
    <button onClick={() => setValue(value => value + 1)}>{value}</button>
  );
};

export default Test;
