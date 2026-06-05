//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type ThreadContextValue } from './types';

/**
 * Shared context provided by `Thread.Root` and consumed by message tiles
 * rendered inside its (virtual) stack.
 */
export const [ThreadContextProvider, useThreadContext] = createContext<ThreadContextValue>('Thread');
