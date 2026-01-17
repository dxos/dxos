//
// Copyright 2025 DXOS.org
//

import type { Operation } from '@dxos/operation';

import type * as UndoMapping from './undo-mapping';

//
// Public Interface
//

/**
 * Lookup result from UndoRegistry.
 */
export type UndoMappingResult = {
  inverse: Operation.Definition<any, any>;
  /** Returns undefined to indicate the operation is not undoable. */
  deriveContext: (input: any, output: any) => any | undefined;
  /** Message provider - may be a static Label or a function. */
  message?: UndoMapping.MessageProvider<Operation.Definition<any, any>>;
};

/**
 * UndoRegistry interface - looks up inverse operations.
 */
export interface UndoRegistry {
  lookup: (operation: Operation.Definition<any, any>) => UndoMappingResult | undefined;
}

//
// Factory
//

/**
 * Creates an UndoRegistry that looks up inverse operations.
 */
export const make = (getMappings: () => UndoMapping.UndoMapping[]): UndoRegistry => {
  const lookup = (operation: Operation.Definition<any, any>): UndoMappingResult | undefined => {
    const mappings = getMappings();
    const mapping = mappings.find((m) => m.operation.meta.key === operation.meta.key);
    if (!mapping) {
      return undefined;
    }

    return {
      inverse: mapping.inverse,
      deriveContext: mapping.deriveContext,
      message: mapping.message,
    };
  };

  return { lookup };
};
