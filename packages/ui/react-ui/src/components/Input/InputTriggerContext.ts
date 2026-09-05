//
// Copyright 2023 DXOS.org
//

import { useEffect } from 'react';

import { createContext } from '@dxos/react-hooks';
import { INPUT_NAME } from '@dxos/react-input';

// Kept out of `Input.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

//
// Trigger context — lets a sibling `Input.TriggerIcon` open a picker registered by a field inside
// the same `Input.Root`. Each registered handler is keyed; the most recent registration wins.
//

export type InputTriggerHandler = () => void;

export type InputTriggerContextValue = {
  registerTrigger: (handler: InputTriggerHandler) => () => void;
  trigger: () => void;
  hasTrigger: boolean;
};

// Default context makes the trigger registry a no-op outside `Input.Root` (consumers opt in).
export const [InputTriggerProvider, useInputTriggerContext] = createContext<InputTriggerContextValue>(INPUT_NAME, {
  registerTrigger: () => () => {},
  trigger: () => {},
  hasTrigger: false,
});

/**
 * Field hook. Pass an opener function; while the field is mounted, an `Input.TriggerIcon`
 * sibling will call this opener on press. Returns a no-op when used outside `Input.Root`.
 */
export const useInputTrigger = (handler: InputTriggerHandler | undefined) => {
  const ctx = useInputTriggerContext('useInputTrigger');
  useEffect(() => {
    if (!handler) {
      return;
    }
    return ctx.registerTrigger(handler);
  }, [ctx, handler]);
};
