//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';
import './Popup.css';

export default () => {
  useEffect(() => {
    console.log('Hello from the popup!');
  }, []);

  return (
    <div>
      <img src='/icon-with-shadow.svg' />
      <h1>vite-plugin-web-extension</h1>
      <p>
        Template: <code>react-ts</code>
      </p>
    </div>
  );
};
