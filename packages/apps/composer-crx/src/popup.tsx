//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { log } from '@dxos/log';

import { Popup, Container, type PopupProps } from './components';
import { Parser } from './parser';

// TODO(burdon): Google browser messaging API.

// TODO(burdon): Util.
const runAsync = (cb: () => Promise<void>) => {
  const t = setTimeout(cb);
  return () => clearTimeout(t);
};

const Root = () => {
  const [parser] = useState(new Parser());

  const handleAdd: PopupProps['onAdd'] = () => {
    return runAsync(async () => {
      // TODO(burdon): Send message to context extension.
      const content = await parser.parse(window.location.href);
      log.info('add', { content });
    });
  };

  const handleSearch: PopupProps['onSearch'] = (text) => {
    log.info('search', { text });
  };

  const handleLaunch: PopupProps['onLaunch'] = () => {
    window.open('https://labs.composer.space');
  };

  return (
    <Container classNames='w-[300px]'>
      <Popup onAdd={handleAdd} onSearch={handleSearch} onLaunch={handleLaunch} />
    </Container>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
