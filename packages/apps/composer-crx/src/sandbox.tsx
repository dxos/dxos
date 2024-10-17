//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

const Root = () => {
  return <div>Sandbox</div>;
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
