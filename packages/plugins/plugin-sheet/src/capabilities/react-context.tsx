//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';

import { SheetCapabilities } from './capabilities';
import { ComputeGraphContextProvider } from '../components';
import { SHEET_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: SHEET_PLUGIN,
    context: ({ children }) => {
      const computeGraphRegistry = useCapability(SheetCapabilities.ComputeGraphRegistry);
      return <ComputeGraphContextProvider registry={computeGraphRegistry}>{children}</ComputeGraphContextProvider>;
    },
  });
