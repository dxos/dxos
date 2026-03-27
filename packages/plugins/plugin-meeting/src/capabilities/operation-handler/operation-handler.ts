// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/operation';

import { MeetingOperationHandlerSet } from '../../operations';

export default Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationHandler, MeetingOperationHandlerSet);
  }),
);
