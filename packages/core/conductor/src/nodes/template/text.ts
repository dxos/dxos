import { Schema as S } from '@effect/schema';

export const getTextTemplateInputSchema = (text: string): S.Schema.AnyNoContext => {
  const variables = findHandlebarVariables(text);
  return S.Struct(Object.fromEntries(variables.map((property) => [property, S.Any])));
};

export const applyTextTemplate = (text: string, input: Record<string, any>): string => {
  const unresolved: string[] = [];
  const result = text.replace(/\{\{([^}]+)\}\}/g, (match: string, p1: string) => {
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

const findHandlebarVariables = (text: string): string[] => {
  const regex = /\{\{([^}]+)\}\}/g; // Matches anything between {{ }}
  const matches = [...text.matchAll(regex)];
  return matches.map((match) => match[1].trim());
};
