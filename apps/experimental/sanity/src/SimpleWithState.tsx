//
// Copyright 2021 DXOS.org
//

import React from 'react';

export const SimpleWithState = () => {
  const [count, setCount] = React.useState(1);

  return (
    <div>
      Hello!!
      <button onClick={() => {
        setCount(count + 1);
      }}>click!</button>
      <p>CLICKs: { count }</p>
    </div>
  );
};
