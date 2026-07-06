//
// Copyright 2026 DXOS.org
//

import { n3reasoner, type Options as EyeOptions } from 'eyereasoner';
import * as Effect from 'effect/Effect';
import { Parser, type Quad } from 'n3';

import { RdfPipelineError } from '../errors';
import { Graph } from '../Graph';
import type { Stage } from '../Stage';
import { storeFromQuads } from '../internal/store';

export type N3ReasonOptions = {
  /** Notation3 rules appended to the graph data before reasoning. */
  readonly rules: string | readonly Quad[];
  /** Optional N3 query pattern; when omitted all newly inferred triples are returned. */
  readonly query?: string | readonly Quad[];
  /** EYE output mode: `derivations` (default), `deductive_closure`, `deductive_closure_plus_rules`, etc. */
  readonly output?: EyeOptions['output'];
  /** When true, merge inferred triples into the input graph. Default true. */
  readonly merge?: boolean;
};

const parseN3 = (source: string): Quad[] => {
  const parser = new Parser({ format: 'text/n3' });
  return parser.parse(source);
};

const asQuads = (input: string | readonly Quad[]): Quad[] =>
  typeof input === 'string' ? parseN3(input) : [...input];

/** Apply Notation3 rules via eyereasoner and materialize the inferred triples. */
export const n3Reason = ({ rules, query, output, merge = true }: N3ReasonOptions): Stage =>
  Effect.fn('rdf-pipeline/stages/n3Reason')(function* (graph: Graph) {
    const dataQuads = [...graph.getQuads(), ...asQuads(rules)];
    const queryQuads = query === undefined ? undefined : asQuads(query);
    const inferred = yield* Effect.tryPromise({
      try: () => n3reasoner(dataQuads, queryQuads, output === undefined ? undefined : { output }),
      catch: (cause) => new RdfPipelineError({ message: 'N3 reasoning failed', cause }),
    });
    const nextStore = merge ? graph.cloneStore() : storeFromQuads([]);
    for (const quad of inferred as Quad[]) {
      nextStore.addQuad(quad);
    }
    return graph.successor(nextStore);
  });
