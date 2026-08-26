//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { TourContext } from '#components';

/**
 * Access the welcome-tour controller (running flag + steps + start/stop hooks).
 * Provided by `WelcomeTour`; throws when called outside a `TourContext.Provider`.
 */
export const useTour = () => {
  return useContext(TourContext) ?? raise(new Error('Missing TourContext'));
};
