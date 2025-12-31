//
// Copyright 2025 DXOS.org
//

import type { OperationDefinition } from '@dxos/operation';

import type { UndoMappingRegistration } from './types';

//
// Public Interface
//

/**
 * UndoRegistry interface - looks up inverse operations.
 */
export interface UndoRegistry {
  lookup: (operation: OperationDefinition<any, any>) =>
    | {
        inverse: OperationDefinition<any, any>;
        deriveContext: (input: any, output: any) => any;
      }
    | undefined;
}

//
// Factory
//

/**
 * Creates an UndoRegistry that looks up inverse operations.
 */
export const make = (getMappings: () => UndoMappingRegistration[]): UndoRegistry => {
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
