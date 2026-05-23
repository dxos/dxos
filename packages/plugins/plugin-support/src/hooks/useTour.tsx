//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { Tour } from '#types';

/**
 * Access the welcome-tour controller (running flag + steps + start/stop hooks).
 * Provided by `WelcomeTour`; throws when called outside a `Tour.Context.Provider`.
 */
export const useTour = () => {
  return useContext(Tour.Context) ?? raise(new Error('Missing Tour.Context'));
};
