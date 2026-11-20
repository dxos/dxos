//
// Copyright 2026 DXOS.org
//

import { createContext } from 'react';

/** Called once the story shows on every peer. */
export const ReadyContext = createContext<(() => void) | undefined>(undefined);
