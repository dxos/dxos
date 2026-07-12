//
// Copyright 2026 DXOS.org
//

// The panproto engine, isolated behind the `@dxos/echo-panproto/wasm` entrypoint so the durable
// `Panproto` API surface never statically depends on the wasm. Today this bridges to upstream
// `@panproto/core` (which ships and loads its own wasm); it is the one swappable implementation detail.

import { type BuiltSchema, type Edge, Panproto } from '@panproto/core';

import { invariant } from '@dxos/invariant';

export type MigrateOptions = {
  /** Parsed source atproto lexicon (the shape `record` is in). */
  sourceLexicon: object;
  /** Parsed target atproto lexicon (the shape to emit). */
  targetLexicon: object;
  /** Source record body vertex, e.g. `org.dxos.book:body`. */
  sourceVertex: string;
  /** Source-property -> target-property renames; unnamed properties align by shared name. */
  renames?: ReadonlyArray<{ from: string; to: string }>;
  /** The JSON record rooted at `sourceVertex`. */
  record: Record<string, unknown>;
};

// A single lazily-initialized engine — `Panproto.init()` loads the bundled wasm once per process.
let enginePromise: Promise<Panproto> | undefined;
const engine = (): Promise<Panproto> => (enginePromise ??= Panproto.init());

const bodyVertex = (schema: BuiltSchema): { id: string } => {
  const vertex = Object.values(schema.vertices).find((entry) => entry.kind === 'object');
  invariant(vertex, 'lexicon has no record body vertex');
  return vertex;
};

const recordVertex = (schema: BuiltSchema): { id: string } | undefined =>
  Object.values(schema.vertices).find((entry) => entry.kind === 'record');

const propEdges = (schema: BuiltSchema): readonly Edge[] => schema.edges.filter((edge) => edge.kind === 'prop');

/**
 * Run panproto's forward structural migration (`liftJson`) from `sourceLexicon` to `targetLexicon`.
 * The vertex/edge alignment is derived automatically: the record body and same-named properties map to
 * themselves, and each declared rename remaps one property. This is the sole panproto call; scalar
 * value coercions and ECHO effects are the runner's concern (they are not expressible in the engine).
 */
export const migrate = async ({
  sourceLexicon,
  targetLexicon,
  sourceVertex,
  renames = [],
  record,
}: MigrateOptions): Promise<Record<string, unknown>> => {
  const panproto = await engine();
  const source = panproto.parseLexicon(sourceLexicon);
  const target = panproto.parseLexicon(targetLexicon);
  const renameOf = new Map(renames.map(({ from, to }) => [from, to]));

  let builder = panproto.migration(source, target).map(bodyVertex(source).id, bodyVertex(target).id);
  const sourceRecord = recordVertex(source);
  const targetRecord = recordVertex(target);
  if (sourceRecord && targetRecord) {
    builder = builder.map(sourceRecord.id, targetRecord.id);
  }

  const targetProps = new Map(propEdges(target).map((edge) => [edge.name, edge]));
  for (const sourceEdge of propEdges(source)) {
    const targetName = renameOf.get(sourceEdge.name ?? '') ?? sourceEdge.name;
    const targetEdge = targetName != null ? targetProps.get(targetName) : undefined;
    if (targetEdge) {
      builder = builder.map(sourceEdge.tgt, targetEdge.tgt).mapEdge(sourceEdge, targetEdge);
    }
  }

  const compiled = builder.compile();
  // `liftJson` is typed `unknown` — its output shape is the target lexicon record, not statically known.
  return compiled.liftJson(record, sourceVertex) as Record<string, unknown>;
};
