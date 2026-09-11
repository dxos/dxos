//
// Copyright 2023 DXOS.org
//

import { useEffect } from 'react';

import { createContext } from '@dxos/react-hooks';

import { FIELD_NAME } from './FieldContext.ts';

// Kept out of `Input.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

//
// Trigger context — lets a sibling `Field.TriggerIcon` open a picker registered by a field inside
// the same `Field.Root`. Each registered handler is keyed; the most recent registration wins.
//

export type FieldTriggerHandler = () => void;

export type FieldTriggerContextValue = {
  registerTrigger: (handler: FieldTriggerHandler) => () => void;
  trigger: () => void;
  hasTrigger: boolean;
};

// Default context makes the trigger registry a no-op outside `Field.Root` (consumers opt in).
export const [FieldTriggerProvider, useFieldTriggerContext] = createContext<FieldTriggerContextValue>(FIELD_NAME, {
  registerTrigger: () => () => {},
  trigger: () => {},
  hasTrigger: false,
});

/**
 * Field hook. Pass an opener function; while the field is mounted, an `Field.TriggerIcon`
 * sibling will call this opener on press. Returns a no-op when used outside `Field.Root`.
 */
export const useFieldTrigger = (handler: FieldTriggerHandler | undefined) => {
  const ctx = useFieldTriggerContext('useFieldTrigger');
  useEffect(() => {
    if (!handler) {
      return;
    }
    return ctx.registerTrigger(handler);
  }, [ctx, handler]);
};
