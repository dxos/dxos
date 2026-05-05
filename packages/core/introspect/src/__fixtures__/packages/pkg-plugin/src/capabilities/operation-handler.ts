//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';

import { FixtureOperationHandlerSet } from '../operations';

export const OperationHandler = () => Capability.contributes(Capabilities.OperationHandler, FixtureOperationHandlerSet);
