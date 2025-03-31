//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { SchemaAST as AST } from 'effect';

import { registerSignalsRuntime } from '@dxos/echo-signals';
import { deepMapValues } from '@dxos/util';

registerSignalsRuntime();

// TODO(burdon): Move to util.
export const updateCounter = (touch: () => void) => {
  let updateCount = -1;
  const unsubscribe = effect(() => {
    touch();
    updateCount++;
  });

  return {
    // https://github.com/tc39/proposal-explicit-resource-management
    [Symbol.dispose]: unsubscribe,
    get count() {
      return updateCount;
    },
  };
};

/**
 * Converts AST to a format that can be compared with test matchers.
 */
export const prepareAstForCompare = (obj: AST.AST): any =>
  deepMapValues(obj, (value: any, recurse, key) => {
    if (typeof value === 'function') {
      return null;
    }

    // Convert symbols to strings.
    if (typeof value === 'object') {
      const clone = { ...value };
      for (const sym of Object.getOwnPropertySymbols(clone as any)) {
        clone[sym.toString()] = clone[sym];
        delete clone[sym];
      }
      return recurse(clone);
    }

    return recurse(value);
  });
