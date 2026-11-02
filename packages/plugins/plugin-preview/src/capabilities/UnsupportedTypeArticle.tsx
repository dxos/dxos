//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';

import { UnsupportedType, type UnsupportedTypeProps } from '../components/index.ts';

/** The typename's last segment (`org.dxos.type.kanban` → `kanban`), which plugin names and descriptions use. */
const getSearchTerm = (typename: string): string => typename.split('.').at(-1) ?? typename;

/** Offers the plugin registry, filtered by the type's name, when the build carries one. */
export const UnsupportedTypeArticle = ({ role, typename }: Omit<UnsupportedTypeProps, 'onFindPlugin'>) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const registryAvailable = ToolkitHooks.usePluginRegistryAvailable();
  const handleFindPlugin = useCallback(
    () => void invokePromise(SettingsOperation.OpenPluginRegistry, { filter: getSearchTerm(typename) }),
    [invokePromise, typename],
  );

  return (
    <UnsupportedType role={role} typename={typename} onFindPlugin={registryAvailable ? handleFindPlugin : undefined} />
  );
};
