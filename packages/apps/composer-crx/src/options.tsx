//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Container, Options } from './components';

const Root = () => {
  return (
    <Container classNames='absolute inset-0 flex justify-center overflow-hidden dark bg-modalSurface'>
      <div className='flex flex-col max-w-[50rem] grow'>
        <Options />
      </div>
    </Container>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
