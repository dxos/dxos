//
// Copyright 2023 DXOS.org
//

import { UnsubscribeCallback } from '@dxos/async';

export type SignalApi = {
  create: SignalFactory;
  untracked: <T>(fn: () => T) => T;
  computed: <T>(fn: () => T) => { value: T };
  effect: (fn: () => void) => UnsubscribeCallback;
  batch: (fn: () => void) => void;
};

export type SignalFactory = () => { notifyRead(): void; notifyWrite(): void };

export let globalSignalApi: SignalApi | undefined;

export const registerSignalApi = (api: SignalApi) => {
  globalSignalApi = api;
};
