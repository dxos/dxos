//
// Copyright 2025 DXOS.org
//

import type { OperationInvoker } from '@dxos/operation';

import * as Common from '../common';

import { useCapability } from './useCapabilities';

export const useOperationInvoker = (): OperationInvoker.OperationInvoker =>
  useCapability(Common.Capability.OperationInvoker);

export const useAppGraph = (): Common.Capability.AppGraph => useCapability(Common.Capability.AppGraph);

export const useLayout = () => useCapability(Common.Capability.Layout);
