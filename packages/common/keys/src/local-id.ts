//
// Copyright 2026 DXOS.org
//

/**
 * A local id names one contribution (a surface, a graph extension) within a plugin. It is appended
 * to the plugin's NSID to form a DXN path, which constrains its final dot-separated segment to
 * camelCase: letters and digits only, starting with a letter. Any dotted prefix is unconstrained,
 * so a segment carrying a typename may contain hyphens.
 *
 * @example Valid:   'about', 'integrationArticle', 'article.journal', 'org.dxos.type.task-set.article'
 * @example Invalid: 'integration-article', 'plugin-spec', 'article.task-set'
 */
export const isValidLocalId = (id: string): boolean => /^[a-zA-Z][a-zA-Z0-9]*$/.test(id.split('.').pop() ?? '');

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/** The characters that actually break camelCase in practice. */
type Separator = '-' | '_';

/** The substring after the last `.`, or the whole string when there is none. */
type LastSegment<S extends string> = S extends `${string}.${infer Rest}` ? LastSegment<Rest> : S;

/**
 * Whether `S` is free of separators and does not open with a digit. Deliberately looser than
 * {@link isValidLocalId}, which also requires every character to be alphanumeric: a pattern check
 * survives an interpolated id (`` `beta${number}` ``), where a character-by-character walk would
 * reject the placeholder it cannot evaluate. The runtime check remains the authority.
 */
type IsCamelSegment<S extends string> = S extends ''
  ? false
  : S extends `${string}${Separator}${string}`
    ? false
    : S extends `${Digit}${string}`
      ? false
      : true;

/**
 * The compile-time counterpart of {@link isValidLocalId}: resolves to `S` when the id is well
 * formed and to an error-message literal otherwise, so a malformed id fails at the authoring site
 * rather than being dropped at dispatch with only a warning.
 *
 * A widened `string` passes through unchecked — a computed id (e.g. `` `${typename}.sectionObjects` ``)
 * carries no literal type to inspect, and the runtime check still covers it.
 *
 * @example
 * declare const create: <const Id extends string>(definition: { id: LocalId<Id> }) => void;
 * create({ id: 'article.taskSet' });  // ok
 * create({ id: 'article.task-set' }); // Type error.
 */
export type LocalId<S extends string> = string extends S
  ? S
  : IsCamelSegment<LastSegment<S>> extends true
    ? S
    : 'Error: the final segment of the id must be camelCase (no hyphens or underscores)';
