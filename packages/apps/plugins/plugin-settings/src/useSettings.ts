//
// Copyright 2023 DXOS.org
//

import { useDeepSignal } from 'deepsignal/react';
import { useContext, useEffect } from 'react';

import { raise } from '@dxos/debug';

import { SettingsContext, SettingsStore, SettingsValues } from './props';

export const useSettings = (): SettingsStore => {
  const { store } = useContext(SettingsContext) ?? raise(new Error('Missing SettingsContext.'));
  const values = useDeepSignal<SettingsValues>(store!.values);
  useEffect(() => {
    console.log('!!!!!!!!!!!!!!!!', store!.values);
  }, [values]);

  console.log('##', values, store?.values);

  return store!;
};
