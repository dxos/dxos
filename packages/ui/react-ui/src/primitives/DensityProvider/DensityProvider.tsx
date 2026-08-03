//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, createContext } from 'react';

import { type Density } from '@dxos/ui-types';

export interface DensityContextValue {
  density?: Density;
}

export type DensityProviderProps = PropsWithChildren<{
  density?: Density;
}>;

export const DensityContext = createContext<DensityContextValue>({ density: 'md' });

/**
 * Provides density through React context only — controls opt in by reading it and emitting
 * `data-density`, which applies the `--dx-control*` override for that element alone.
 *
 * It deliberately does NOT emit a `dx-density-*` class. Doing so set the knobs for the entire
 * subtree, so a provider intended for one region (the deck's `lg` pane toolbar) silently resized
 * unrelated descendants that read `--dx-control` — form labels, for instance. A region that wants
 * subtree-wide density applies the class itself, where its scope is visible at the call site
 * (see `Toolbar.Root`).
 */
export const DensityProvider = ({ density, children }: DensityProviderProps) => (
  <DensityContext.Provider value={{ density }}>{children}</DensityContext.Provider>
);
