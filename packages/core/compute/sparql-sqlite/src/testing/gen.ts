//
// Copyright 2026 DXOS.org
//

import { type Quad, RDF, XSD, iri, lit } from '../terms.ts';
import { DEUS, PROV, SX } from './vocabulary.ts';

/**
 * Deterministic synthetic data shaped like pipeline-rdf's reified facts and code-index's import graph.
 * Every item is generated from its own index, so batches are independent and any variant can
 * regenerate exactly the same quads in-process (no upload bandwidth in the measurement).
 */

const ENTITY_POOL = 20_000;
const AGENT_POOL = 500;
const VERBS = Array.from({ length: 200 }, (_, index) => `verb${index}`);
const FACTUALITY = ['CT+', 'CT-', 'PR+', 'PR-', 'PS+', 'PS-', 'CTu', 'Uu'];
const WORDS = (
  'the a meeting project budget review launch design team report next week travel paris rome berlin ' +
  'contract invoice draft schedule call notes plan release bug fix feature roadmap quarter goal hire ' +
  'customer partner demo deadline update status risk owner'
).split(' ');
const BASE_TIME = Date.UTC(2026, 0, 1);

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const entityIri = (index: number) => `https://dxos.org/entity/e${index}`;
export const agentIri = (index: number) => `https://dxos.org/agent/a${index}`;
export const factIri = (index: number) => `https://dxos.org/fact/${index}`;
export const fileIri = (index: number) => `https://dxos.org/deus/file/${index}`;
export const sourceDxn = (index: number) => `dxn:echo:@:M${Math.floor(index / 8)}`;

/** ~10.2 triples per fact. */
export const generateFacts = (start: number, count: number): Quad[] => {
  const quads: Quad[] = [];
  for (let index = start; index < start + count; index++) {
    const rng = mulberry32(index * 2654435761);
    const fact = iri(factIri(index));
    const subject = Math.floor(ENTITY_POOL * rng() ** 3);
    const verb = VERBS[Math.floor(VERBS.length * rng() ** 2)];
    const objectIsEntity = rng() < 0.6;
    const objectEntity = Math.floor(ENTITY_POOL * rng() ** 3);
    const confidence = Math.round(rng() * 100) / 100;
    const factuality = FACTUALITY[Math.floor(rng() * FACTUALITY.length)];
    const agent = Math.floor(AGENT_POOL * rng() ** 2);
    const time = new Date(BASE_TIME + index * 300_000 + Math.floor(rng() * 300_000)).toISOString();
    const wordCount = 8 + Math.floor(rng() * 7);
    const quote = Array.from({ length: wordCount }, () => WORDS[Math.floor(rng() * WORDS.length)]).join(' ');
    const directive = rng() < 0.15;

    quads.push(
      { s: fact, p: iri(`${RDF}type`), o: iri(`${SX}Fact`) },
      { s: fact, p: iri(`${SX}subject`), o: iri(entityIri(subject)) },
      { s: fact, p: iri(`${SX}predicate`), o: lit(verb) },
      {
        s: fact,
        p: iri(`${SX}object`),
        o: objectIsEntity ? iri(entityIri(objectEntity)) : lit(`${WORDS[objectEntity % WORDS.length]} ${objectEntity}`),
      },
      { s: fact, p: iri(`${SX}confidence`), o: lit(String(confidence), `${XSD}decimal`) },
      { s: fact, p: iri(`${SX}factuality`), o: lit(factuality) },
      { s: fact, p: iri(`${PROV}wasAttributedTo`), o: iri(agentIri(agent)) },
      { s: fact, p: iri(`${PROV}wasDerivedFrom`), o: lit(sourceDxn(index)) },
      { s: fact, p: iri(`${PROV}generatedAtTime`), o: lit(time, `${XSD}dateTime`) },
      { s: fact, p: iri(`${SX}quote`), o: lit(quote) },
    );
    if (directive) {
      quads.push({ s: fact, p: iri(`${SX}force`), o: lit('directive') });
    }
  }
  return quads;
};

/** ~6.5 triples per file: a DAG-ish import graph with local clustering and a few long edges. */
export const generateCode = (start: number, count: number): Quad[] => {
  const quads: Quad[] = [];
  for (let index = start; index < start + count; index++) {
    const rng = mulberry32(index * 40503 + 17);
    const file = iri(fileIri(index));
    quads.push(
      { s: file, p: iri(`${RDF}type`), o: iri(`${DEUS}File`) },
      { s: file, p: iri(`${DEUS}path`), o: lit(`packages/p${index % 50}/src/f${index}.ts`) },
    );
    const imports = 3 + Math.floor(rng() * 4);
    for (let edge = 0; edge < imports && index > 0; edge++) {
      const target = rng() < 0.05 ? Math.floor(rng() * index) : Math.max(0, index - 1 - Math.floor(rng() * 200));
      quads.push({ s: file, p: iri(`${DEUS}imports`), o: iri(fileIri(target)) });
    }
  }
  return quads;
};
