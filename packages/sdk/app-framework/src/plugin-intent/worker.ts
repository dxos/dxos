//
// Copyright 2025 DXOS.org
//

import { INTENT_PLUGIN } from './actions';
import { dispatcherModule } from './intent-dispatcher';
import { definePlugin } from '../core';

export const IntentPlugin = () => definePlugin({ id: INTENT_PLUGIN }, [dispatcherModule]);
