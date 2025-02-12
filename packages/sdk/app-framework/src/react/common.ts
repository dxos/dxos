//
// Copyright 2025 DXOS.org
//

import { useCapability } from './useCapabilities';
import { Capabilities } from '../common';

export const useIntentDispatcher = () => useCapability(Capabilities.IntentDispatcher);

export const useAppGraph = () => useCapability(Capabilities.AppGraph);

export const useLayout = () => useCapability(Capabilities.Layout);
