//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Type, normalizeEntityId } from '@dxos/pipeline-rdf';
import { Organization, Person } from '@dxos/types';

// Surface forms (name + emails) under which a Person may be referenced in extracted facts.
const personKeys = (person: Person.Person): string[] =>
  [person.fullName, ...(person.emails ?? []).map((email) => email.value)].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

const orgKeys = (org: Organization.Organization): string[] =>
  [org.name].filter((value): value is string => typeof value === 'string' && value.length > 0);

// Reconciliation table: normalized entity id (as produced by the extractor) → canonical ECHO URI.
// ECHO objects remain the source of truth (spec §4); this table lets advisory facts point at them.
export const buildEntityIndex = (
  objects: readonly (Person.Person | Organization.Organization)[],
): Map<string, string> => {
  const index = new Map<string, string>();
  for (const object of objects) {
    const uri = Obj.getURI(object);
    const keys = Obj.instanceOf(Person.Person, object) ? personKeys(object) : orgKeys(object);
    for (const key of keys) {
      index.set(normalizeEntityId(key), uri);
    }
  }
  return index;
};

// Resolve a fact's subject/object entity ids to canonical URIs where the index knows them; unknown
// referents are simply omitted (an advisory fact about an unresolved entity is still a valid fact).
export const reconcileFactEntities = (
  fact: Type.Fact,
  index: Map<string, string>,
): { subject?: string; object?: string } => {
  const subject = 'entity' in fact.assertion.subject ? index.get(fact.assertion.subject.entity) : undefined;
  const object = 'entity' in fact.assertion.object ? index.get(fact.assertion.object.entity) : undefined;
  return { ...(subject ? { subject } : {}), ...(object ? { object } : {}) };
};
