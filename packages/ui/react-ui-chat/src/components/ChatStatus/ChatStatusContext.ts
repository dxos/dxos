import { createContext } from '@dxos/react-ui';
//
// Copyright 2025 DXOS.org
//

// Kept out of `ChatStatus.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

//
// Context
//

export type ChatStatusContextValue = {
  /** Whole seconds elapsed since ChatStatus.Root mounted. Only advances while `running` is true. */
  elapsed: number;
  /** Whether the ChatStatus.Root tick is currently active. Toggled via the ChatStatusController. */
  running: boolean;
};

export const [ChatStatusProvider, useChatStatusContext] = createContext<ChatStatusContextValue>('ChatStatus');
