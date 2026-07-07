//
// Copyright 2026 DXOS.org
//

import { type DocumentFacts } from '../stages';
import { type Assertion, type ExtractDocument } from '../types';

// Gold-standard corpus for the multi-model extraction benchmark: each document is paired with the RDF
// facts a correct extraction should yield, so the benchmark can score precision/recall/F1 in addition
// to raw counts. Sentences are single, unambiguous propositions spanning distinct predicate shapes
// (employment, membership, location, temporal, dependency, authorship, family, …); predicates follow
// the extraction rules (e.g. `is-a` for membership, timeless present, "works for" → "works at").

/** One expected fact as surface strings (subject/predicate/object) for a document. */
export type ExpectedFact = { readonly subject: string; readonly predicate: string; readonly object: string };

/** A benchmark document: extraction input plus the facts a correct extraction should produce. */
export type EvalDoc = ExtractDocument & { readonly expected: readonly ExpectedFact[] };

const doc = (index: number, text: string, expected: readonly ExpectedFact[]): EvalDoc => ({
  text,
  source: `doc-${index}`,
  expected,
});

// A single expected fact (the common case).
const fact = (subject: string, predicate: string, object: string): ExpectedFact[] => [{ subject, predicate, object }];

export const EVAL_DOCS: readonly EvalDoc[] = [
  doc(1, 'Alice works at Acme.', fact('Alice', 'works at', 'Acme')),
  doc(2, 'Bob is a software engineer.', fact('Bob', 'is-a', 'software engineer')),
  doc(3, 'Carol lives in Berlin.', fact('Carol', 'lives in', 'Berlin')),
  doc(4, 'Dave founded Globex.', fact('Dave', 'founded', 'Globex')),
  doc(5, 'Acme acquired Initech in 2021.', fact('Acme', 'acquired', 'Initech')),
  doc(6, 'Eve manages the Orion project.', fact('Eve', 'manages', 'Orion project')),
  doc(7, 'Frank reports to Eve.', fact('Frank', 'reports to', 'Eve')),
  doc(8, 'The Orion project depends on the Titan library.', fact('Orion project', 'depends on', 'Titan library')),
  doc(9, 'Socrates was a Greek philosopher.', fact('Socrates', 'is-a', 'Greek philosopher')),
  doc(10, 'Plato was a student of Socrates.', fact('Plato', 'student of', 'Socrates')),
  doc(11, 'George Orwell wrote 1984.', fact('George Orwell', 'wrote', '1984')),
  doc(12, 'Helen is married to Ivan.', fact('Helen', 'married to', 'Ivan')),
  doc(13, 'Paris is the capital of France.', fact('Paris', 'capital of', 'France')),
  doc(14, 'Tesla is headquartered in Austin.', fact('Tesla', 'headquartered in', 'Austin')),
  doc(15, 'Marie Curie discovered radium.', fact('Marie Curie', 'discovered', 'radium')),
  doc(16, 'The Great Wall is located in China.', fact('Great Wall', 'located in', 'China')),
  doc(17, 'Jupiter is a planet.', fact('Jupiter', 'is-a', 'planet')),
  doc(18, 'A whale is a mammal.', fact('whale', 'is-a', 'mammal')),
  doc(19, 'Kevin owns a bakery.', fact('Kevin', 'owns', 'bakery')),
  doc(20, 'Laura teaches at Stanford.', fact('Laura', 'teaches at', 'Stanford')),
  doc(21, 'Mike was born in Chicago.', fact('Mike', 'born in', 'Chicago')),
  doc(22, 'Nora leads the design team.', fact('Nora', 'leads', 'design team')),
  doc(23, 'Oscar speaks French.', fact('Oscar', 'speaks', 'French')),
  doc(24, 'Quinn directed Inception.', fact('Quinn', 'directed', 'Inception')),
  doc(25, 'Rome was founded by Romulus.', fact('Rome', 'founded by', 'Romulus')),
  doc(26, 'Sara invested in Globex.', fact('Sara', 'invested in', 'Globex')),
  doc(27, 'The Titan library is written in Rust.', fact('Titan library', 'written in', 'Rust')),
  doc(28, 'Tom collaborates with Uma.', fact('Tom', 'collaborates with', 'Uma')),
  doc(29, 'Victor chairs the board.', fact('Victor', 'chairs', 'board')),
  doc(30, 'Wendy studies biology.', fact('Wendy', 'studies', 'biology')),
  doc(31, 'The Nile is a river.', fact('Nile', 'is-a', 'river')),
  doc(32, 'Xavier moved to Tokyo.', fact('Xavier', 'moved to', 'Tokyo')),
  doc(33, 'Yara owns the patent.', fact('Yara', 'owns', 'patent')),
  doc(34, 'Zack mentors Alice.', fact('Zack', 'mentors', 'Alice')),
  doc(35, 'The Orion project is funded by Acme.', fact('Orion project', 'funded by', 'Acme')),
  doc(36, 'Beethoven composed the Ninth Symphony.', fact('Beethoven', 'composed', 'Ninth Symphony')),
  doc(37, 'Diana works for the United Nations.', fact('Diana', 'works at', 'United Nations')),
  doc(38, 'Edison invented the light bulb.', fact('Edison', 'invented', 'light bulb')),
  doc(39, 'Fiona is the CEO of Initech.', fact('Fiona', 'CEO of', 'Initech')),
  doc(40, 'Greg belongs to the chess club.', fact('Greg', 'belongs to', 'chess club')),
  doc(41, 'The report was written by Helen.', fact('report', 'written by', 'Helen')),
  doc(42, 'Ian lives in Madrid.', fact('Ian', 'lives in', 'Madrid')),
  doc(43, 'Jade founded a startup.', fact('Jade', 'founded', 'startup')),
  doc(44, 'The engine runs on diesel.', fact('engine', 'runs on', 'diesel')),
  doc(45, 'Kelly reports to the director.', fact('Kelly', 'reports to', 'director')),
  doc(46, 'Leo studies at MIT.', fact('Leo', 'studies at', 'MIT')),
  doc(47, 'Mona painted the mural.', fact('Mona', 'painted', 'mural')),
  doc(48, 'Nate manages the sales team.', fact('Nate', 'manages', 'sales team')),
  doc(49, 'Olivia founded Initech.', fact('Olivia', 'founded', 'Initech')),
  doc(50, 'The Titan library powers the Orion project.', fact('Titan library', 'powers', 'Orion project')),
];

/** Precision/recall/F1 of extracted facts against the gold corpus, plus the raw match counts. */
export type Accuracy = {
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly matched: number;
  readonly predicted: number;
  readonly expected: number;
};

const EXPECTED_BY_SOURCE = new Map(EVAL_DOCS.map((entry) => [entry.source, entry.expected]));

// Loose surface-string match: lowercase, trim, collapse whitespace, drop trailing punctuation.
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/, '');

const termLabel = (term: Assertion['subject']): string =>
  'entity' in term ? (term.label ?? term.entity) : term.literal;

// Two surfaces "align" when equal or one contains the other after normalization — tolerates phrasing
// drift ("Greek philosopher" vs "philosopher", "is a" vs "is-a") while still requiring the right terms.
const aligns = (left: string, right: string): boolean => {
  const a = normalize(left);
  const b = normalize(right);
  return a.length > 0 && b.length > 0 && (a === b || a.includes(b) || b.includes(a));
};

const factMatches = (fact: DocumentFacts['facts'][number], expected: ExpectedFact): boolean =>
  aligns(termLabel(fact.assertion.subject), expected.subject) &&
  aligns(termLabel(fact.assertion.object), expected.object) &&
  aligns(fact.assertion.predicate, expected.predicate);

/**
 * Score extracted facts against the gold corpus. Each extracted fact counts as a true positive if it
 * matches an as-yet-unmatched expected fact for the same document; precision = matched / predicted,
 * recall = matched / expected, F1 the harmonic mean.
 */
export const scoreAccuracy = (docs: readonly DocumentFacts[]): Accuracy => {
  let matched = 0;
  let predicted = 0;
  let expected = 0;
  for (const entry of docs) {
    const gold = EXPECTED_BY_SOURCE.get(entry.doc.source) ?? [];
    expected += gold.length;
    predicted += entry.facts.length;
    const used = new Set<number>();
    for (const extracted of entry.facts) {
      const index = gold.findIndex((candidate, position) => !used.has(position) && factMatches(extracted, candidate));
      if (index >= 0) {
        used.add(index);
        matched += 1;
      }
    }
  }
  const precision = predicted > 0 ? matched / predicted : 0;
  const recall = expected > 0 ? matched / expected : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1, matched, predicted, expected };
};
