import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
  // issue(grazianoramiro): https://github.com/dxos/protocols/issues/157
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
