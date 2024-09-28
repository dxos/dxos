//
// Copyright 2024 DXOS.org
//

import { type FunctionType } from '@dxos/plugin-script';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { defaultFunctions } from './function-defs';

// TODO(wittjosiah): Factor out.
const OBJECT_ID_LENGTH = 60; // 33 (space id) + 26 (object id) + 1 (separator).

/**
 * Map from binding to fully qualified ECHO ID.
 */
export const mapFunctionBindingToId =
  (functions: FunctionType[]) =>
  (formula: string): string => {
    return formula.replace(/([a-zA-Z0-9]+)\((.*)\)/g, (match, binding, args) => {
      if (defaultFunctions.find((fn) => fn.name === binding) || binding === 'EDGE') {
        return match;
      }

      const fn = functions.find((fn) => fn.binding === binding);
      if (fn) {
        return `${fullyQualifiedId(fn)}(${args})`;
      } else {
        return match;
      }
    });
  };

/**
 * Map from fully qualified ECHO ID to binding.
 */
export const mapFunctionBindingFromId =
  (functions: FunctionType[]) =>
  (formula: string): string => {
    return formula.replace(/([a-zA-Z0-9]+):([a-zA-Z0-9]+)\((.*)\)/g, (match, spaceId, objectId, args) => {
      const id = `${spaceId}:${objectId}`;
      if (id.length !== OBJECT_ID_LENGTH) {
        return match;
      }

      const fn = functions.find((fn) => fullyQualifiedId(fn) === id);
      if (fn?.binding) {
        return `${fn.binding}(${args})`;
      } else {
        return match;
      }
    });
  };
