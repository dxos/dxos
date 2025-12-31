//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { OperationDefinition } from '@dxos/operation';

import * as Common from '../common';
import { Capability } from '../core';

import type { UndoMappingRegistration, UndoRegistryInterface } from './types';

/**
 * Creates an UndoRegistry that looks up inverse operations.
 */
export const createUndoRegistry = (getMappings: () => UndoMappingRegistration[]): UndoRegistryInterface => {
  const lookup = (
    operation: OperationDefinition<any, any>,
  ):
    | {
        inverse: OperationDefinition<any, any>;
        deriveContext: (input: any, output: any) => any;
      }
    | undefined => {
    const mappings = getMappings();
    const mapping = mappings.find((m) => m.operation.meta.key === operation.meta.key);
    if (!mapping) {
      return undefined;
    }

    return {
      inverse: mapping.inverse,
      deriveContext: mapping.deriveContext,
    };
  };

  return { lookup };
};

export default Capability.makeModule((context) =>
  Effect.gen(function* () {
    const registry = createUndoRegistry(() => context.getCapabilities(Common.Capability.UndoMapping).flat());

    return Effect.succeed(Capability.contributes(Common.Capability.UndoRegistry, registry));
  }).pipe(Effect.flatten),
);

