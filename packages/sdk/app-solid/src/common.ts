//
// Copyright 2025 DXOS.org
//

import { type Accessor } from 'solid-js';

import { Common } from '@dxos/app-framework';

import { useCapability } from './useCapabilities';

export const useIntentDispatcher = () => useCapability(Common.Capability.IntentDispatcher);

export const useAppGraph = (): Accessor<Common.Capability.AppGraph> => useCapability(Common.Capability.AppGraph);

export const useLayout = () => useCapability(Common.Capability.Layout);
