//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

export const getTextTemplateInputSchema = (text: string): Schema.Schema.AnyNoContext => {
  const variables = findHandlebarVariables(text);
  return Schema.Struct(Object.fromEntries(variables.map((property) => [property, Schema.Any])));
};

// TODO(dmaretskyi): Remove and use the json template with a single string as input.
export const applyTextTemplate = (text: string, input: Record<string, any>): string => {
  const unresolved: string[] = [];
  const result = text.replaceAll(/\{\{([^}]+)\}\}/g, (match: string, p1: string) => {
    if (input[p1]) {
      return input[p1];
    } else {
      unresolved.push(p1);
      return match;
    }
  });

  if (unresolved.length > 0) {
    throw new Error(`Unresolved properties: [${unresolved.join(', ')}]`);
  }

  return result;
};

// TODO(dmaretskyi): Remove and use the json template with a single string as input.
export const findHandlebarVariables = (text: string): string[] => {
  const regex = /\{\{([^}]+)\}\}/g; // Matches anything between {{ }}
  const matches = [...text.matchAll(regex)];
  return matches.map((match) => match[1].trim());
};
