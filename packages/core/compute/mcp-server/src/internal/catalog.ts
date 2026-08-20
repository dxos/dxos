//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import type * as Projection from './projection';

/**
 * The searchable set of operations behind `findOperations` / `invokeOperation`.
 *
 * The projection used to spend one MCP tool per operation, so every operation's name, description
 * and full input schema entered the model's context whether or not the task needed it. Here the
 * operations are data the model queries instead: the fixed tool surface stays three tools however
 * many operations a host registers, and an input schema is fetched by key once the model has
 * chosen what to call.
 */
export type Catalog = {
  /** Every projected operation, in registry order. */
  readonly operations: readonly Projection.ProjectedOperation[];
  /** Rows matching a query — schemas included only for an explicit `keys` lookup. */
  readonly find: (query: Query) => Projection.OperationEntry[];
  /** The operation a call names, in any of the key spellings {@link matchesKey} accepts. */
  readonly get: (key: string) => CatalogEntry | undefined;
};

export type Query = {
  /** Whitespace-separated terms, all of which must appear in the key, name or description. */
  readonly query?: string;
  /** Prompt name of a skill, as `findOperations` reports it and `skillLoad` accepts it. */
  readonly skill?: string;
  /** Exact keys; naming them is what asks for the schemas. */
  readonly keys?: readonly string[];
};

/** A projected operation ready to dispatch: the projection plus the struct its input decodes through. */
export type CatalogEntry = Projection.ProjectedOperation & {
  /**
   * The decode side of the input round trip, built once here rather than per call. Absent when the
   * operation's input is not an object, where there are no fields to decode through.
   */
  readonly decodeSchema?: Schema.Codec<any, any>;
};

/**
 * Key spellings a model may carry back: the registry's own `dxn:`-prefixed and versioned form, the
 * bare NSID a skill's `tools` list names, and anything in between. Compared stripped rather than
 * rejected, because a key copied out of one listing has to work in the other.
 */
const normalize = (key: string): string => key.replace(/^dxn:/, '').replace(/:\d+\.\d+\.\d+$/, '');

const matchesKey = (candidate: string, requested: string): boolean => normalize(candidate) === normalize(requested);

/** The text a `query` term is matched against; built once per entry rather than per term. */
const haystack = (entry: Projection.OperationEntry): string =>
  [entry.key, entry.name, entry.description].filter(Boolean).join(' ').toLowerCase();

/** The row a search returns: the entry minus the schemas, which only a `keys` lookup carries. */
const summarize = (entry: Projection.OperationEntry): Projection.OperationEntry => {
  const { inputSchema: _input, outputSchema: _output, ...summary } = entry;
  return summary;
};

export const make = (operations: readonly Projection.ProjectedOperation[]): Catalog => {
  const entries: CatalogEntry[] = operations.map((operation) => ({
    ...operation,
    // A non-object input projects no fields, and `Schema.Struct({})` over one would strip the
    // input rather than validate it — so the round trip is skipped entirely for those.
    decodeSchema: operation.wireSchema != null ? Schema.Struct(operation.parameters) : undefined,
  }));

  return {
    operations,

    get: (key) => entries.find((candidate) => matchesKey(candidate.key, key)),

    find: ({ query, skill, keys }) => {
      if (keys != null && keys.length > 0) {
        // Named keys are a lookup rather than a search: the caller has chosen, and what it needs
        // back is the schema it must write against. An unknown key contributes nothing instead of
        // failing the call — `invokeOperation` is where a wrong key gets an actionable error.
        return keys.flatMap((key) => {
          const match = entries.find((candidate) => matchesKey(candidate.key, key));
          return match ? [match.entry] : [];
        });
      }

      const terms = (query ?? '')
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 0);
      return entries
        .filter(({ entry }) => {
          if (skill != null && !entry.skills.some((name) => name.toLowerCase() === skill.toLowerCase())) {
            return false;
          }
          const text = haystack(entry);
          return terms.every((term) => text.includes(term));
        })
        .map(({ entry }) => summarize(entry));
    },
  };
};
