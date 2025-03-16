//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Popup, Container } from './components';

const Root = () => {
  return (
    <Container classNames='w-[300px]'>
      <Popup
        onLaunch={() => {
          window.open('https://labs.composer.space');
        }}
      />
    </Container>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
