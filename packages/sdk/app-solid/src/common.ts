//
// Copyright 2025 DXOS.org
//

import { type Accessor } from 'solid-js';

import { Capabilities } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { useCapability } from './useCapabilities';

export const useOperationInvoker = (): Accessor<Capabilities.OperationInvoker> =>
  useCapability(Capabilities.OperationInvoker);

export const useAppGraph = (): Accessor<AppCapabilities.AppGraph> => useCapability(AppCapabilities.AppGraph);

export const useLayout = () => useCapability(AppCapabilities.Layout);
