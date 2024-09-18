//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';

import { useSheetContext } from './sheet-context';

export const useThreads = () => {
  const { model } = useSheetContext();

  const sheet = model.sheet;

  effect(() => {
    const threads = sheet.threads;
    for (const thread of threads) {
      console.log('thread:', thread);
    }
  });
};
