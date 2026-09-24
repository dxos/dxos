//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { type PropsWithChildren, useContext } from 'react';

import { useDefaultValue } from '@dxos/react-hooks';

import { createDefaultBackends } from '../../core/index.ts';
import { ViewState } from '../../types/index.ts';
import { ViewStateContextProvider } from './view-state-hooks.ts';

/** Provides the per-context UI state manager. Replaces the former `SelectionProvider`. */
export const ViewStateProvider = ({
  children,
  manager: managerProp,
}: PropsWithChildren<{ manager?: ViewState.Manager }>) => {
  const registry = useContext(RegistryContext);
  const manager = useDefaultValue(
    managerProp,
    () => new ViewState.Manager({ registry, backends: createDefaultBackends(registry) }),
  );
  return <ViewStateContextProvider manager={manager}>{children}</ViewStateContextProvider>;
};
