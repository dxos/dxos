//
// Copyright 2024 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { CreateAtom } from '@dxos/app-graph';

// TODO(wittjosiah): Try to move to not re-exporting just one function.
export const atomFromSignal = <T>(cb: () => T): Atom.Atom<T> => CreateAtom.fromSignal(cb);

export * from './components';
export * from './hooks';
export * from './types';
export { createMenuAction, createMenuItemGroup, createLineSeparator, createGapSeparator } from './util';
export { MenuBuilder } from './builder';
