//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';

import type * as UndoMapping from './undo-mapping.ts';

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
  scope?: (input: any, output: any) => string | undefined;
  mergeKey?: (input: any, output: any) => string | undefined;
  context?: (input: any, output: any) => unknown;
  merge?: (earlier: { input: any; output: any }, later: { input: any; output: any }) => { input: any; output: any };
  toast?: boolean;
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
      scope: mapping.scope,
      mergeKey: mapping.mergeKey,
      context: mapping.context,
      merge: mapping.merge,
      toast: mapping.toast,
    };
  };

  return { lookup };
};
