//
// Copyright 2025 DXOS.org
//

import { Capabilities } from '../common';

import { useCapability } from './useCapabilities';

export const useIntentDispatcher = () => useCapability(Capabilities.IntentDispatcher);

export const useAppGraph = () => useCapability(Capabilities.AppGraph);

export const useLayout = () => useCapability(Capabilities.Layout);
