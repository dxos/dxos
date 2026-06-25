//
// Copyright 2026 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useContext, useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { Routine, RoutineCapabilities } from '#types';

/**
 * Returns the reactive editing flag, a derived atom (for toolbar builders), and a setter for a given routine.
 * Editing state lives in the plugin's {@link RoutineCapabilities.State} capability, keyed by object URI.
 */
export const useRoutineEditing = (subject: Routine.Routine) => {
  const stateAtom = useCapability(RoutineCapabilities.State);
  const registry = useContext(RegistryContext);

  const editingAtom = useMemo(
    () => Atom.make((get) => Boolean(get(stateAtom).editing[Obj.getURI(subject)])),
    [stateAtom, subject],
  );
  const editing = useAtomValue(editingAtom);

  const setEditing = useCallback(
    (value: boolean) =>
      registry.update(stateAtom, (state) => {
        const uri = Obj.getURI(subject);
        const { [uri]: _previous, ...rest } = state.editing;
        return { ...state, editing: value ? { ...rest, [uri]: true } : rest };
      }),
    [registry, stateAtom, subject],
  );

  return { editing, editingAtom, setEditing };
};
