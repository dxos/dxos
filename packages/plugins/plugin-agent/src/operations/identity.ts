//
// Copyright 2026 DXOS.org
//

import { RDF } from '@dxos/pipeline-rdf';

/**
 * Predicates whose object identifies the subject: an account (a username, a handle, an email address) or an explicit
 * same-as. The extractor mints one entity per mention it cannot resolve, so the same person read from a roster, a
 * Discord thread and an email arrives as several entities; these predicates are what ties them back together.
 */
const IDENTIFYING_IRIS: ReadonlySet<string> = new Set([`${RDF.Vocab.FOAF}account`, RDF.Vocab.OWL_SAME_AS]);

/** A predicate the ontology does not know, but whose words say its object is an address (`has email`, `email is`). */
const ADDRESS_WORDS = /\b(e-?mail|email address|mailbox)\b/;

const identifying = (predicate: string): boolean =>
  IDENTIFYING_IRIS.has(RDF.Ontology.DEFAULT.resolve(predicate).iri) || ADDRESS_WORDS.test(predicate.toLowerCase());

/**
 * The form two keys are compared in: a URI or DID as is, any other string (a name, a handle, an email address) as the
 * slug pipeline-rdf mints entity keys with, so `@dmaretskyi`, `dmaretskyi` and an entity keyed `dmaretskyi` agree.
 */
export const canonicalKey = (key: string): string =>
  /^[a-z][a-z0-9+.-]*:\/\//i.test(key) || key.startsWith('did:')
    ? key
    : key
        .trim()
        .toLowerCase()
        .replace(/^@/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

/** The key a term contributes to identity: an entity's key, or a literal's value (an account named as text). */
const termKey = (term: RDF.Fact['assertion']['subject']): string =>
  term.kind === 'entity' ? term.entity : term.literal;

/**
 * Groups entity keys that name one entity, by strong identifiers only: the subject and object of an identifying fact,
 * and each set of keys passed in `known` (an ECHO object's URI, its DID and its account identities). Names alone never
 * merge: two people may share one. Returns, for each canonical key, every canonical key in its group.
 */
export const identityGroups = (
  facts: readonly RDF.Fact[],
  known: Iterable<readonly string[]> = [],
): Map<string, ReadonlySet<string>> => {
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    let root = key;
    for (let next = parent.get(root); next !== undefined && next !== root; next = parent.get(root)) {
      root = next;
    }
    parent.set(key, root);
    return root;
  };
  const union = (left: string, right: string) => {
    const [a, b] = [find(left), find(right)];
    if (a !== b) {
      parent.set(a, b);
    }
  };

  for (const fact of facts) {
    if (identifying(fact.assertion.predicate)) {
      const subject = canonicalKey(termKey(fact.assertion.subject));
      const object = canonicalKey(termKey(fact.assertion.object));
      if (subject.length > 0 && object.length > 0) {
        union(subject, object);
      }
    }
  }
  for (const keys of known) {
    const canonical = keys.map(canonicalKey).filter((key) => key.length > 0);
    canonical.slice(1).forEach((key) => union(canonical[0], key));
  }

  const groups = new Map<string, Set<string>>();
  for (const key of parent.keys()) {
    const root = find(key);
    const group = groups.get(root) ?? new Set<string>();
    group.add(key);
    groups.set(root, group);
  }
  const byKey = new Map<string, ReadonlySet<string>>();
  for (const group of groups.values()) {
    group.forEach((key) => byKey.set(key, group));
  }
  return byKey;
};

/** `keys` widened to every key the identity groups put with any of them, in canonical form. */
export const expandKeys = (keys: Iterable<string>, groups: ReadonlyMap<string, ReadonlySet<string>>): Set<string> => {
  const expanded = new Set<string>();
  for (const key of keys) {
    const canonical = canonicalKey(key);
    expanded.add(canonical);
    groups.get(canonical)?.forEach((member) => expanded.add(member));
  }
  return expanded;
};
