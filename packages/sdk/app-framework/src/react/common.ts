//
// Copyright 2025 DXOS.org
//

import * as Common from '../common';

import { useCapability } from './useCapabilities';

export const useOperationInvoker = () => useCapability(Common.Capability.OperationInvoker);

export const useAppGraph = (): Common.Capability.AppGraph => useCapability(Common.Capability.AppGraph);

export const useLayout = () => useCapability(Common.Capability.Layout);
