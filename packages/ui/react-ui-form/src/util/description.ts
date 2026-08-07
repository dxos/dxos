//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

/**
 * Text Effect attaches as a schema's own description: the base scalars name their type, and the built-in
 * refinements (`minLength`, `between`, `pattern`, …) restate the constraint they enforce.
 */
const GENERATED_DESCRIPTION = new RegExp(
  [
    // Base scalars.
    'a (string|number|boolean)',
    // Strings.
    'a string( at least| at most)? \\d+ character\\(s\\) long',
    'a non empty string',
    'a string matching the pattern .*',
    'a string (starting with|ending with|including) ".*"',
    'an? (lowercase|uppercase) string',
    'a string with no leading or trailing whitespace',
    // Numbers.
    'an integer',
    'a number between .+ and .+',
    'a (positive|negative) number',
    'a non-(negative|positive) number',
    'a number (greater|less) than( or equal to)? .+',
    'a finite number',
    'a number divisible by .+',
    // Arrays.
    'an array of (at least|at most|exactly) \\d+ item\\(s\\)',
  ]
    .map((pattern) => `^(${pattern})$`)
    .join('|'),
);

/**
 * Resolves the schema description a form should present as the field's documentation, ignoring the text a
 * built-in refinement generates: a form shows a description to people (and hands it to agents as prose
 * about the field), so "a string at least 1 character(s) long" reads as validation noise rather than
 * documentation. The constraint itself still reaches consumers through the JSON-schema keywords
 * (`minLength`, `pattern`, …) the same refinement emits.
 *
 * An authored description always wins: it replaces the generated text on the same AST node, and only the
 * generated form matches here.
 */
export const getFieldDescription = (ast: SchemaAST.AST): string | undefined => {
  const description = Option.getOrUndefined(SchemaAST.getDescriptionAnnotation(ast));
  if (typeof description !== 'string' || GENERATED_DESCRIPTION.test(description)) {
    return undefined;
  }

  return description;
};
