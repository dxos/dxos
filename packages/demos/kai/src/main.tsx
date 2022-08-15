//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
  return (
    <div>Kai</div>
  );
};

const main = () => {
  const root = createRoot(document.getElementById('root')!);
  root.render(<App />);
};

main();
