//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { log } from '@dxos/log';

import { Options, Root } from './components/index.ts';

const OptionsApp = () => {
  return (
    <Root name='options'>
      <div className='dx-fullscreen flex justify-center overflow-hidden dx-modal-surface'>
        <div className='dx-document dx-base-surface'>
          <Options />
        </div>
      </div>
    </Root>
  );
};

const main = async () => {
  log.info('options');
  createRoot(document.getElementById('root')!).render(<OptionsApp />);
};

void main();
