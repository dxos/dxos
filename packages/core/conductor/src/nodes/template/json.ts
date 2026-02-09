//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { deepMapValues } from '@dxos/util';

import { findHandlebarVariables } from './text';

// TODO(dmaretskyi): https://www.npmjs.com/package/json-templates.

export const getObjectTemplateInputSchema = (template: unknown): Schema.Schema.AnyNoContext => {
  const inputs: Record<string, Schema.Schema.AnyNoContext> = {};

  const go = (value: unknown) => {
    switch (typeof value) {
      case 'object':
        if (value !== null) {
          for (const [_, prop] of Object.entries(value)) {
            go(prop);
          }
        }
        break;
      case 'string': {
        const variables = findHandlebarVariables(value);
        for (const variable of variables) {
          inputs[variable] = Schema.Any;
        }
        break;
      }
      default:
        break;
    }
  };

  go(template);

  return Schema.Struct(inputs);
};

export const applyObjectTemplate = (template: unknown, props: Record<string, unknown>): unknown => {
  const unresolved: string[] = [];
  const result = deepMapValues(template, (value, recurse) => {
    if (typeof value === 'string') {
      if (value.match(REGEX_ONLY_TEMPLATE)) {
        if (props[value.slice(2, -2)] == null) {
          unresolved.push(value.slice(2, -2));
          return value;
        } else {
          return props[value.slice(2, -2)];
        }
      } else {
        const result = value.replaceAll(REGEX_TEMPLATE, (match: string, p1: string) => {
          if (props[p1]) {
            return props[p1] as any;
          } else {
            unresolved.push(p1);
            return match;
          }
        });
        return result;
      }
    }
    return recurse(value);
  });

  if (unresolved.length > 0) {
    throw new Error(`Unresolved properties: [${unresolved.join(', ')}]`);
  }

  return result;
};

const REGEX_TEMPLATE = /\{\{([^}]+)\}\}/g; // Matches anything between {{ }}

// Matches a string that is only a template: "{{ foo }}"
const REGEX_ONLY_TEMPLATE = /^\{\{([^}]+)\}\}$/g;
