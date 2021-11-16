//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

const App = () => {
  return (
    <div style={{
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      padding: 8
    }}>
      Open the DXOS Developer Tools extension.
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
