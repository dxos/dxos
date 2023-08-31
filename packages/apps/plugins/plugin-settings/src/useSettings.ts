//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { SettingsContext, SettingsStore } from './props';

export const useSettings = (): SettingsStore => {
  const { store } = useContext(SettingsContext) ?? raise(new Error('Missing SettingsContext.'));
  return store!;
};
