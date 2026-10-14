//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { useContext } from 'react';

/** The view's atom registry; components read atoms through `useAtomValue` and write through this. */
export const useRegistry = () => useContext(RegistryContext);
