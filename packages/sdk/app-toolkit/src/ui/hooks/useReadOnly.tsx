//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';

import { AppCapabilities } from '../../app-framework/index.ts';

/** Whether the host contributes {@link AppCapabilities.ReadOnly}; follows the contribution as it lands. */
export const useReadOnly = (): boolean => Hooks.useOptionalCapability(AppCapabilities.ReadOnly) === true;

/** Wraps a surface component that only writes, so it renders nothing on a read-only host. */
export const unlessReadOnly = <P extends object>(Component: ComponentType<P>): ComponentType<P> => {
  const Gated = (props: P) => (useReadOnly() ? null : <Component {...props} />);
  Gated.displayName = `UnlessReadOnly(${Component.displayName ?? Component.name})`;
  return Gated;
};
