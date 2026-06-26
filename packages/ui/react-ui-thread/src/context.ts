//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type FC, type ReactNode } from 'react';

// Imported so TypeScript can name this type in the emitted .d.ts (ThreadContext → Message).
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Message } from '@dxos/types';

import { type ThreadContextValue } from './types';

/**
 * Context provided by `Thread.Root` and consumed by its parts. Extends the
 * consumer-facing {@link ThreadContextValue} with internal coordination (e.g.
 * focusing the composer from the header's select affordance).
 */
export type ThreadContext = ThreadContextValue & {
  /** Register the composer's focus handler (set by `Thread.Textbox`). */
  registerComposerFocus: (focus: (() => void) | undefined) => void;
  /** Focus the thread composer (used by `Thread.Header`'s select affordance). */
  focusComposer: () => void;
};

export const [ThreadContextProvider, useThreadContext]: readonly [
  FC<ThreadContext & { children: ReactNode }>,
  (consumerName: string) => ThreadContext,
] = createContext<ThreadContext>('Thread');
