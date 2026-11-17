//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType } from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';

/** Renders `Component` only while the host does not contribute `AppCapabilities.ReadOnly`. */
export const unlessReadOnly = <P extends object>(Component: ComponentType<P>): ComponentType<P> =>
  function UnlessReadOnly(props: P) {
    return ToolkitHooks.useReadOnly() ? null : <Component {...props} />;
  };
